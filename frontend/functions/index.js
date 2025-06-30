const functions = require("firebase-functions");
const admin = require("firebase-admin");


// Firebase管理者SDKを初期化
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

const project = process.env.GCLOUD_PROJECT;
const location = "us-central1"; // or your region

// SDKクライアントをグローバル変数として定義
let genAI; 

/**
 * Cloud Functionが初めて呼び出された時に、SDKクライアントを一度だけ非同期で初期化する
 */
async function initializeGenAI() {
  if (!genAI) {
    // 動的インポートを使用してESMライブラリを正しく読み込む
    const { GoogleGenAI } = await import("@google/genai");
    genAI = new GoogleGenAI({
      vertexai: true,
      project: project,
      location: location,
    });
  }
}

/**
 * 新しい旅行プランが作成されたら起動し、カバー画像を生成する関数
 */
exports.generateCoverImageOnCreate = functions
  .region(location)
  .runWith({ memory: "512MB", timeoutSeconds: 180 })
  .firestore.document("users/{userId}/trips/{tripId}")
  .onCreate(async (snap, context) => {
    await initializeGenAI(); // SDKクライアントの初期化が完了するのを待つ
    const tripData = snap.data();
    const destination = tripData.destination; // `name` ではなく `destination` を参照

    if (tripData.coverImageUrl || !destination) {
      functions.logger.log("カバー画像は既に存在するか、地名が空のためスキップします。");
      return null;
    }

    functions.logger.log(`「${destination}」のカバー画像生成を開始します。`);
    
    try {
      const imageCacheRef = db.collection("destinationImages").doc(destination);
      const cacheDoc = await imageCacheRef.get();

      if (cacheDoc.exists) {
        const existingUrl = cacheDoc.data().url;
        functions.logger.log(`キャッシュから「${destination}」の画像を再利用します。`);
        return snap.ref.update({ coverImageUrl: existingUrl });
      }

      const prompt = `旅行先の「${destination}」の有名な観光地や美しい風景。明るい色彩のモダンな旅行ポスター風イラスト。`;
      
      const response = await genAI.models.generateImages({
        model: "imagen-4.0-fast-generate-preview-06-06",
        prompt: prompt,
        config: { numberOfImages: 1 },
      });

      if (!response?.generatedImages || response.generatedImages.length === 0) {
        throw new Error("AIから有効な画像が返されませんでした。");
      }
      const imageBytes = response.generatedImages[0].image.imageBytes;

      const bucket = storage.bucket();
      const filePath = `destination_covers/${destination}_${Date.now()}.png`;
      const file = bucket.file(filePath);
      const buffer = Buffer.from(imageBytes, "base64");
      
      await file.save(buffer, { metadata: { contentType: "image/png" } });
      await file.makePublic();
      const imageUrl = file.publicUrl();

      await imageCacheRef.set({ url: imageUrl });
      return snap.ref.update({ coverImageUrl: imageUrl });

    } catch (error) {
      functions.logger.error(`「${destination}」のカバー画像生成に失敗しました:`, error);
      return null;
    }
  });


/**
 * 荷物アイテムが作成されたら起動し、アイテム画像を生成する関数
 */
exports.processTripItemsOnCreate = functions
  .region(location)
  .runWith({ memory: "512MB", timeoutSeconds: 540 })
  .firestore.document("users/{userId}/trips/{tripId}/items/{itemId}")
  .onCreate(async (snap, context) => {
    await initializeGenAI(); // SDKクライアントの初期化が完了するのを待つ
    const item = snap.data();
    const itemName = item.name;

    if (item.imageUrl || !itemName) {
      functions.logger.log(`「${itemName}」には既に画像があるか、名前が空のため処理をスキップします。`);
      return null;
    }
    
    functions.logger.log(`新しいアイテム「${itemName}」の画像生成を開始します。`);

    try {
      const normalizedItemName = itemName.toLowerCase().trim();
      const imageCacheRef = db.collection("itemImages").doc(normalizedItemName);
      const cacheDoc = await imageCacheRef.get();

      if (cacheDoc.exists) {
        const existingUrl = cacheDoc.data().url;
        functions.logger.log(`キャッシュから「${itemName}」の画像を再利用します。`);
        return snap.ref.update({ imageUrl: existingUrl });
      }

      const prompt = `「${itemName}」の単品の写真。白い背景に置かれた、清潔感のある製品写真のスタイル。`;
      
      const response = await genAI.models.generateImages({
        model: "imagen-4.0-fast-generate-preview-06-06",
        prompt: prompt,
        config: { numberOfImages: 1 },
      });

      if (!response?.generatedImages || response.generatedImages.length === 0) {
        throw new Error("AIから有効な画像が返されませんでした。");
      }
      const imageBytes = response.generatedImages[0].image.imageBytes;

      const bucket = storage.bucket();
      const filePath = `item_images/${normalizedItemName}.png`;
      const file = bucket.file(filePath);
      const buffer = Buffer.from(imageBytes, "base64");
      
      await file.save(buffer, { metadata: { contentType: "image/png" } });
      await file.makePublic();
      const imageUrl = file.publicUrl();

      await imageCacheRef.set({ url: imageUrl });
      return snap.ref.update({ imageUrl: imageUrl });

    } catch (error) {
      functions.logger.error(`「${itemName}」の画像生成に失敗しました:`, error);
      return null;
    }
  });

/**
 * 荷物アイテムのリストに変更（作成、更新、削除）があった場合に起動し、
 * 親の旅行ドキュメントの進捗カウントを更新する。
 */
exports.updateTripProgress = functions
.region(location)
.firestore.document("users/{userId}/trips/{tripId}/items/{itemId}")
.onWrite(async (change, context) => {
const { userId, tripId } = context.params;
const tripRef = db.collection("users").doc(userId).collection("trips").doc(tripId);

try {
    // アイテムのサブコレクション全体を取得
    const itemsSnapshot = await tripRef.collection("items").get();
    
    let totalItemsCount = 0;
    let packedItemsCount = 0;

    // 各アイテムをチェックしてカウント
    itemsSnapshot.forEach(doc => {
        totalItemsCount++;
        if (doc.data().packed) {
            packedItemsCount++;
        }
    });

    functions.logger.log(`旅行プラン(ID: ${tripId})の進捗を更新します: 総数=${totalItemsCount}, 準備完了=${packedItemsCount}`);

    // 親の旅行ドキュメントにカウントを保存
    return tripRef.update({
        totalItemsCount: totalItemsCount,
        packedItemsCount: packedItemsCount
    });
} catch (error) {
    functions.logger.error(`旅行プラン(ID: ${tripId})の進捗更新に失敗しました:`, error);
    return null;
}
});

/**
 * 旅行プランをシェアするためのHTTPS呼び出し可能な関数
 */
exports.shareTrip = functions
  .region(location)
  .https.onCall(async (data, context) => {
    // ユーザーが認証されていない場合はエラー
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "この機能を利用するには認証が必要です。"
      );
    }
    
    const userId = context.auth.uid;
    const { tripId } = data;

    if (!tripId) {
       throw new functions.https.HttpsError(
        "invalid-argument",
        "tripIdが必要です。"
      );
    }

    try {
      // 元の旅行プランのデータを取得
      const tripRef = db.collection("users").doc(userId).collection("trips").doc(tripId);
      const tripDoc = await tripRef.get();
      if (!tripDoc.exists) {
        throw new functions.https.HttpsError("not-found", "指定された旅行プランが見つかりません。");
      }
      const tripData = tripDoc.data();

      // アイテムリストを取得
      const itemsSnapshot = await tripRef.collection("items").orderBy("createdAt", "asc").get();
      const itemsData = itemsSnapshot.docs.map(doc => doc.data());
      
      // 公開用のコレクションに新しいドキュメントを作成
      const sharedTripRef = db.collection("sharedTrips").doc();
      
      await sharedTripRef.set({
        ...tripData,
        items: itemsData, // アイテムリストをサブコレクションではなく配列として含める
        originalUserId: userId,
        originalTripId: tripId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      functions.logger.log(`旅行プラン(ID: ${tripId})がシェアされました。新しいシェアID: ${sharedTripRef.id}`);

      // 新しく作成されたシェア用ドキュメントのIDを返す
      return { sharedId: sharedTripRef.id };

    } catch (error) {
        functions.logger.error(`旅行プラン(ID: ${tripId})のシェアに失敗しました:`, error);
        throw new functions.https.HttpsError("internal", "シェア処理中にエラーが発生しました。");
    }
  });