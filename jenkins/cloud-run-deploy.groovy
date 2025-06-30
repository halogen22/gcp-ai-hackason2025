pipeline {
    agent {
        docker {
            image 'google/cloud-sdk:slim'
        }
    }
    
    environment {
        REPO_NAME = "gcp-ai-agent-hackathon-2025"
        
        CLOUDRUN_DIR = "backend"
        CLOUDSDK_CONFIG = "${WORKSPACE}/.gcloud_config_${UUID.randomUUID()}"
        PROJECT_ID = "gcp-hackathon-459912"
        GCP_REGION = "asia-northeast1"
        IMAGE_NAME = "cloud-run-image"
    }
    
    parameters {
            string(name: 'REPO_BRANCH', defaultValue: 'create-cloud-run-jenkinsfile', description: 'デプロイするGitリポジトリのブランチ')
            booleanParam(name: 'SKIP_BUILD', defaultValue: false, description: '')    
    }
    
    stages {
        stage('clone source code') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: params.REPO_BRANCH]],
                    userRemoteConfigs: [[
                        url: 'https://github.com/halogen22/gcp-ai-agent-hackathon-2025.git',
                        credentialsId: '88f66ac3-d8a0-4ee1-9b01-91fb88dad41e'
                    ]]
                ])
            }
        }
        stage('GCP認証と設定') {
            steps {
                script {
                    withCredentials([file(credentialsId: "cloud-run-manager", variable: 'GCP_KEY_FILE')]) {
                        sh "gcloud auth activate-service-account --key-file=${GCP_KEY_FILE}"
                        sh "gcloud config set project ${env.PROJECT_ID}"
                        sh "gcloud config set run/region ${env.GCP_REGION}"
                    }
                    echo "GCP認証とプロジェクト設定が完了しました。"
                }
            }
        }
        stage('ビルドとプッシュ (Cloud Build)') {
            steps {
                if(!params.SKIP_BUILD){
                    dir("${env.WORKSPACE}/${CLOUDRUN_DIR}") {
                        script {
                            sh "gcloud auth list"
                            sh "gcloud config list account"
                            
                            env.PRIMARY_IMAGE_FULL_PATH = "${env.GCP_REGION}-docker.pkg.dev/${env.PROJECT_ID}/${env.REPO_NAME}/${env.REPO_BRANCH}:${env.BUILD_NUMBER ?: 'latest'}"
                            sh "gcloud builds submit --tag \"${env.PRIMARY_IMAGE_FULL_PATH}\" ."
                            echo "コンテナイメージのビルドとプッシュが完了しました: ${params.REPO_BRANCH}"
                        }
                    }
                } else {
                    echo "ビルドのスキップ"
                }
            }
        }
        stage('Cloud Run へのデプロイ') {
            steps {
                script {
                    def deployOptions = [
                        "--image ${env.PRIMARY_IMAGE_FULL_PATH}",
                        "--region ${env.GCP_REGION}",
                        "--platform managed", 
                        "--quiet",
                        "--allow-unauthenticated",
                        "--port 8080"
                        // "--set-env-vars KEY1=value1,KEY2=value2", // 環境変数を設定
                        // "--cpu 1",
                        // "--memory 512Mi",
                        // "--min-instances 0", // アイドル時に0インスタンスにスケールダウン (コールドスタートが発生しうる)
                        // "--max-instances 2",
                        // "--service-account YOUR_RUNTIME_SERVICE_ACCOUNT@${env.PROJECT_ID}.iam.gserviceaccount.com", // 特定のランタイムサービスアカウントを指定
                        // "--vpc-connector projects/${env.PROJECT_ID}/locations/${env.GCP_REGION}/connectors/YOUR_CONNECTOR_NAME", // VPCコネクタ指定
                        // "--update-secrets /etc/secret/mysecret=MY_SECRET_NAME:latest" // Secret Managerからシークレットをマウント
                    ]

                    sh "gcloud run deploy ${params.REPO_BRANCH}-app ${deployOptions.join(' \\\n')}"
                    echo "Cloud Run サービス ${params.REPO_BRANCH}-app のデプロイが完了しました。"
                    sh "gcloud run services describe ${params.REPO_BRANCH}-app --platform managed --region ${env.GCP_REGION} --format='value(status.url)'"
                }
            }
        }
    }
    
    post {
        always {
            echo 'パイプライン実行後のクリーンアップ処理を開始します...'
            dir("${env.WORKSPACE}") {
                 sh "rm -rf ${env.REPO_NAME}"
            }
            echo 'パイプライン実行後のクリーンアップ処理が完了しました。'
        }
        success {
            echo 'パイプラインは正常に完了しました。'
        }
        failure {
            echo 'パイプラインは失敗しました。'
        }
    }
}