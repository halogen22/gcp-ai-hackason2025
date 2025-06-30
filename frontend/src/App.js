import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, getDocs, getDoc, setDoc, updateDoc, query, orderBy, writeBatch, serverTimestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from "firebase/functions";
import { ArrowLeft, Plus, Trash2, Check, LogOut, Package, Image as ImageIcon, Backpack, RefreshCw, Sparkles, MapPin, ListChecks, CheckCircle2, ChevronDown, Share2, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Confetti from 'react-confetti';

// --- Firebase Configuration (Production) --------------------------------
const firebaseConfig = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID
};

// --- Backend API Endpoint ----------------------------------
const API_BASE_URL = process.env.PROD_APP_URL; 

// --- Initialize Firebase Services ---------------------------
let app, auth, db, storage, functions;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app, 'us-central1'); // Functionsリージョンを指定
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

function LandingPage() {
    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Googleログインに失敗しました:", error);
            alert("ログインに失敗しました。コンソールを確認してください。");
        }
    };

    return (
        <div className="bg-white text-gray-800">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm shadow-sm z-50">
                <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {/* <img src="/images/logo.png" alt="旅の荷造りAI ロゴ" className="w-8 h-8" /> */}
                        <Backpack className="w-8 h-8 text-indigo-500" />
                        <span className="text-xl font-bold">旅の荷造りAI</span>
                    </div>
                    <button
                        onClick={handleLogin}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        ログイン / 新規登録
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center text-center text-white">
                {/* 背景画像 */}
                <div 
                    className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
                    style={{ 
                        backgroundImage: `url('/images/hero-image.png')` 
                    }}
                >
                    {/* 画像の上に重ねる暗いオーバーレイ */}
                    <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50"></div>
                </div>

                {/* テキストコンテンツ */}
                <div className="relative z-10 container mx-auto px-6">
                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight shadow-text">
                        面倒な荷造りは、<br className="sm:hidden" />AIにおまかせ。
                    </h1>
                    <p className="mt-4 text-lg text-indigo-100 max-w-2xl mx-auto shadow-text">
                        旅行の行き先と日数を入れるだけで、AIがあなたに最適な持ち物リストを自動で作成。忘れ物の心配から解放され、もっとスマートな旅の準備を。
                    </p>
                    <button
                        onClick={handleLogin}
                        className="mt-8 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transform hover:scale-105 transition-transform flex items-center gap-3 mx-auto"
                    >
                        <Sparkles className="w-6 h-6" />
                        無料で始める
                    </button>
                </div>
            </section>
            
            {/* How it Works Section */}
            <section className="py-20">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-2">使い方は３ステップ</h2>
                    <p className="text-gray-500 mb-12">誰でも、今すぐ、かんたんに。</p>
                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="p-6">
                            <MapPin className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                            <h3 className="text-xl font-bold mb-2">1. 行き先を入力</h3>
                            <p className="text-gray-600">旅行したい場所と日数を教えてください。</p>
                        </div>
                        <div className="p-6">
                            <ListChecks className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                            <h3 className="text-xl font-bold mb-2">2. AIがリストアップ</h3>
                            <p className="text-gray-600">AIが気候やアクティビティに合わせて、最適な荷物リストと画像を自動で生成します。</p>
                        </div>
                        <div className="p-6">
                            <CheckCircle2 className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                            <h3 className="text-xl font-bold mb-2">3. 荷物を詰めるだけ</h3>
                            <p className="text-gray-600">あとはチェックリストに従って荷物を詰めるだけ。忘れ物の心配はありません。</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-8">
                <div className="container mx-auto px-6 text-center">
                    <p>&copy; 2025 旅の荷造りAI. All Rights Reserved.</p>
                </div>
            </footer>
        </div>
    );
}


export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState({ type: 'main' });

    useEffect(() => {
        const path = window.location.pathname;
        if (path.startsWith('/share/')) {
            const sharedId = path.split('/')[2];
            setPage({ type: 'share', sharedId });
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <LoadingScreen message="読み込み中..." />;

    if (page.type === 'share') {
        return <SharedTripScreen sharedId={page.sharedId} />;
    }
    
    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
            {user ? <PackingApp user={user} /> : <LandingPage />}
        </div>
    );
}

function LoadingScreen({ message = "読み込み中..." }) {
    return <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100"><RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" /><p className="text-lg text-gray-600">{message}</p></div>;
}

function PackingApp({ user }) {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const q = query(collection(db, `users/${user.uid}/trips`), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tripsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTrips(tripsData);
            setLoading(false);
        }, (error) => {
            console.error("旅行リストの監視に失敗しました:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleSignOut = async () => { try { await signOut(auth); } catch (error) { console.error("ログアウトに失敗しました:", error); }};

    if (loading) return <LoadingScreen message="旅行リストを読み込んでいます..." />;
    if (selectedTrip) return <TripDetailsScreen trip={selectedTrip} user={user} onBack={() => setSelectedTrip(null)} />;
    return <TripListScreen user={user} trips={trips} onSelectTrip={setSelectedTrip} onSignOut={handleSignOut} />;
}

function ShareModal({ shareUrl, onClose }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // 2秒後に表示を戻す
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-center">
                <h3 className="text-xl font-bold mb-4">リストをシェアする</h3>
                <p className="text-gray-600 mb-4">以下のURLをコピーして、友人や家族にシェアしましょう。</p>
                <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                    <input 
                        type="text" 
                        value={shareUrl} 
                        readOnly 
                        className="bg-transparent w-full outline-none"
                    />
                    <button onClick={handleCopy} className="bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600 flex-shrink-0">
                        {copied ? 'コピー完了!' : <Copy className="w-5 h-5" />}
                    </button>
                </div>
                <button onClick={onClose} className="mt-6 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                    閉じる
                </button>
            </div>
        </div>
    );
}

function TripListScreen({ user, trips, onSelectTrip, onSignOut }) {
    const [showForm, setShowForm] = useState(false);
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-12 h-12 rounded-full border-2 border-indigo-200" />
                    {/* {user.photoURL && <img src={user.photoURL} alt={user.displayName || 'User'} className="w-12 h-12 rounded-full border-2 border-indigo-200" />} */}
                    <div>
                    {/*<h1 className="text-2xl font-bold text-gray-800">荷造りリスト</h1> </div>*/}
                    {/* <p className="text-gray-500">{user.displayName || 'ゲストユーザー'}さんの旅行プラン</p> */}
                    <p className="font-bold text-gray-600">旅行プラン一覧</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowForm(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-transform transform hover:scale-105 shadow-md"><Plus className="w-5 h-5" />新しい旅行</button>
                    <button onClick={onSignOut} title="ログアウト" className="text-gray-500 hover:text-indigo-600"><LogOut className="w-6 h-6" /></button>
                </div>
            </header>
            {showForm && <NewTripForm user={user} onTripCreated={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.length === 0 && !showForm && (
                    <div className="col-span-full text-center py-16 bg-white rounded-xl shadow-sm">
                        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" /><h3 className="text-xl font-semibold text-gray-700">まだ旅行プランがありません</h3><p className="text-gray-500 mt-2">「新しい旅行」ボタンから最初のプランを作成しましょう！</p>
                    </div>
                )}
                {trips.map(trip => <TripCard key={trip.id} trip={trip} onSelect={() => onSelectTrip(trip)} />)}
            </div>
        </div>
    );
}

function TripCard({ trip, onSelect }) {
    const packedItems = trip.packedItemsCount || 0;
    const totalItems = trip.totalItemsCount || 0;
    const isComplete = totalItems > 0 && packedItems === totalItems;
    const progress = totalItems > 0 ? (packedItems / totalItems) * 100 : 0;
    const remainingItems = totalItems - packedItems;
    
    return (
        <div onClick={onSelect} className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 transform relative">
            {isComplete && (
                <div className="absolute top-2 -right-10 transform rotate-45 bg-green-500 text-white text-xs font-bold px-10 py-1 shadow-lg z-10">
                    <span className="flex items-center gap-1"><CheckCircle2 size={14} />準備完了</span>
                </div>
            )}
            <div className={`h-48 bg-gray-200 flex items-center justify-center transition-opacity duration-300 ${isComplete ? 'opacity-70' : ''}`}>
                {trip.coverImageUrl ? 
                    <img src={trip.coverImageUrl} alt={trip.destination} className="w-full h-full object-cover"/> 
                    : <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                }
            </div>
            <div className="p-5">
                <h3 className="text-xl font-bold truncate">{trip.destination}</h3>
                <p className="text-gray-500">{trip.numPeople}日間の旅行</p>
                <div className="mt-4">
                    <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                        <span className="font-semibold">進捗</span>
                        {isComplete ? (
                             <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">完了</span>
                        ) : (
                             (remainingItems > 0) &&
                             <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">残り {remainingItems}個</span>
                        )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                        <div className={`h-2.5 rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

async function callBackendApi(endpoint, params) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.detail || 'バックエンドAPIの呼び出しに失敗しました。');
    }
    return response.json();
}

function NewTripForm({ user, onTripCreated, onCancel }) {
    const [destination, setDestination] = useState('');
    const [numPeople, setNumPeople] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!destination.trim()) { setError("旅行先を入力してください。"); return; }
        setIsLoading(true);
        setError('');

        try {
            const result = await callBackendApi('/generate-packing-list', { destination, num_day: numPeople });
            const { summary, packing_list } = result;

            const tripDocRef = await addDoc(collection(db, `users/${user.uid}/trips`), {
                userId: user.uid,
                destination: destination,
                numPeople: Number(numPeople),
                summary,
                coverImageUrl: null,
                createdAt: serverTimestamp(),
                totalItemsCount: packing_list.length,
                packedItemsCount: 0
            });
            
            const batch = writeBatch(db);
            for (const packingItem of packing_list) {
                const itemDocRef = doc(collection(db, `users/${user.uid}/trips/${tripDocRef.id}/items`));
                batch.set(itemDocRef, {
                    name: packingItem.item,
                    quantity: packingItem.quantity,
                    packed: false,
                    createdAt: serverTimestamp()
                });
            }
            await batch.commit();
            onTripCreated();

        } catch (error) {
            console.error("旅行プランの作成に失敗しました:", error);
            setError(error.message || "AIによるリスト生成に失敗しました。");
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">新しい旅行プランを作成</h2>
            <form onSubmit={handleSubmit}>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label htmlFor="destination" className="block text-sm font-medium text-gray-700">旅行先</label>
                        <input type="text" id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="例：ハワイ、沖縄" disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="numPeople" className="block text-sm font-medium text-gray-700">日数</label>
                        <input type="number" id="numPeople" value={numPeople} onChange={(e) => setNumPeople(Math.max(1, parseInt(e.target.value, 10) || 1))} min="1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" disabled={isLoading} />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={onCancel} disabled={isLoading} className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg">キャンセル</button>
                    <button type="submit" disabled={isLoading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition-shadow shadow-md disabled:bg-indigo-300 disabled:cursor-not-allowed">
                        {isLoading ? <><RefreshCw className="animate-spin w-5 h-5" /><span>生成中...</span></> : <><Backpack className="w-5 h-5"/><span>AIでリスト作成</span></>}
                    </button>
                </div>
            </form>
        </div>
    );
}

function TripDetailsScreen({ trip, user, onBack }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState("");
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState("");
    const [isSharing, setIsSharing] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false); // 紙吹雪用の状態

    const tripItemsCollectionRef = collection(db, `users/${user.uid}/trips/${trip.id}/items`);

    useEffect(() => {
        setLoading(true);
        const q = query(tripItemsCollectionRef, orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const itemsData = querySnapshot.docs.filter(d => !d.data().isDeleted).map(doc => ({ id: doc.id, ...doc.data() }));
            
            // 完了状態の変化をチェック
            const allPacked = itemsData.length > 0 && itemsData.every(item => item.packed);
            if(allPacked) {
                setShowConfetti(true); // 全て完了したら紙吹雪を表示
            }

            setItems(itemsData);
            setLoading(false);
        }, (error) => { console.error("アイテムリストの監視に失敗しました:", error); setLoading(false); });
        return () => unsubscribe();
    }, [trip.id, user.uid]);
    
    const handleShare = async () => {
        setIsSharing(true);
        try {
            const shareTripFunc = httpsCallable(functions, 'shareTrip');
            const result = await shareTripFunc({ tripId: trip.id });
            const { sharedId } = result.data;
            const url = `${window.location.origin}/share/${sharedId}`;
            setShareUrl(url);
            setShowShareModal(true);
        } catch (error) {
            console.error("シェアに失敗しました:", error);
            alert(error.message || "シェア用のリンク作成に失敗しました。");
        } finally {
            setIsSharing(false);
        }
    };

    const togglePacked = async (itemId, currentStatus) => { await updateDoc(doc(tripItemsCollectionRef, itemId), { packed: !currentStatus }); };
    const updateQuantity = async (itemId, newQuantity) => { await updateDoc(doc(tripItemsCollectionRef, itemId), { quantity: Math.max(1, newQuantity) }); };
    const handleAddItem = async (e) => { e.preventDefault(); if (!newItemName.trim()) return; await addDoc(tripItemsCollectionRef, { name: newItemName, quantity: 1, packed: false, createdAt: serverTimestamp() }); setNewItemName(""); };
    const handleDeleteItem = async (itemId) => { if (window.confirm("このアイテムを削除しますか？")) { await deleteDoc(doc(tripItemsCollectionRef, itemId)); }};

    if (loading) return <LoadingScreen message="荷物リストを読み込み中..." />;
    const unpackedItems = items.filter(item => !item.packed);
    const packedItems = items.filter(item => item.packed);

    return (
        <div className="relative">
             {showConfetti && <Confetti recycle={false} onConfettiComplete={() => setShowConfetti(false)}/>}
            {showShareModal && <ShareModal shareUrl={shareUrl} onClose={() => setShowShareModal(false)} />}
            
            <div className="relative h-60 bg-gray-400">
                {trip.coverImageUrl ? (
                    <img src={trip.coverImageUrl} alt={trip.destination} className="w-full h-full object-cover"/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                        <RefreshCw className="w-10 h-10 text-gray-500 animate-spin" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start text-white">
                    <button onClick={onBack} className="flex items-center gap-2 bg-black/30 p-2 rounded-full hover:bg-black/50 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button onClick={handleShare} disabled={isSharing} className="bg-green-500 hover:bg-green-600 font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors disabled:bg-green-300">
                        {isSharing ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Share2 className="w-5 h-5" />}
                        シェア
                    </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                     <h1 className="text-4xl font-bold" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.7)'}}>{trip.destination}</h1>
                     <p className="text-lg" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}>{trip.numPeople}日間の旅行</p>
                </div>
            </div>
            
            <div className="container mx-auto p-4 md:px-8 max-w-4xl space-y-8">
                <div className="bg-white rounded-xl shadow-lg ">
                    <button
                        onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                        className="w-full flex justify-between items-center p-4 text-left "
                    >
                        <h3 className="font-bold text-lg text-gray-800">AIからの旅行アドバイス</h3>
                        <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${isSummaryOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isSummaryOpen && (
                        <div className="p-4 pt-0">
                            <article className="prose prose-sm max-w-none border-t pt-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{trip.summary || "アドバイスはありません。"}</ReactMarkdown>
                            </article>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4 border-b-2 pb-2 border-gray-200">荷造りリスト</h2>
                        {unpackedItems.length === 0 && packedItems.length > 0 && (
                            <div className="text-center py-10">
                                <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-3" />
                                <h3 className="text-2xl font-bold text-green-800">準備完了！</h3>
                                <p className="text-gray-600 mt-2">すべての荷物を詰め終わりました。良い旅を！</p>
                            </div>
                        )}
                        {unpackedItems.length > 0 && unpackedItems.map(item => <ItemRow key={item.id} item={item} onTogglePacked={togglePacked} onUpdateQuantity={updateQuantity} onDeleteItem={handleDeleteItem} isReadOnly={false} />)}
                        {unpackedItems.length === 0 && packedItems.length === 0 && (
                            <div className="text-center py-10 bg-gray-50 rounded-lg">
                                <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" /><h3 className="text-xl font-semibold text-gray-700">荷物はありません</h3>
                                <p className="text-gray-600">下のフォームからアイテムを追加しましょう。</p>
                            </div>
                        )}
                    </div>
                    {packedItems.length > 0 && (
                        <div className="mb-10">
                            <h2 className="text-2xl font-semibold mb-4 border-b-2 pb-2 border-gray-200">準備完了の荷物</h2>
                            {packedItems.map(item => <ItemRow key={item.id} item={item} onTogglePacked={togglePacked} onUpdateQuantity={updateQuantity} onDeleteItem={handleDeleteItem} isReadOnly={false} />)}
                        </div>
                    )}
                    <div className="border-t pt-6">
                        <h3 className="font-bold text-lg mb-3">アイテムを追加</h3>
                        <form onSubmit={handleAddItem} className="flex items-center gap-3">
                            <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="追加するアイテム名" className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-transform transform hover:scale-105 shadow-md"><Plus className="w-5 h-5" />追加</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SharedTripScreen({ sharedId }) {
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSharedTrip = async () => {
            try {
                const docRef = doc(db, "sharedTrips", sharedId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTrip(docSnap.data());
                } else {
                    setError("このシェアURLは無効か、削除されたようです。");
                }
            } catch (err) {
                console.error("シェアされたリストの取得に失敗:", err);
                setError("リストの読み込み中にエラーが発生しました。");
            } finally {
                setLoading(false);
            }
        };
        fetchSharedTrip();
    }, [sharedId]);

    if (loading) return <LoadingScreen message="シェアされたリストを読み込んでいます..." />;
    if (error) return <div className="flex items-center justify-center min-h-screen text-red-500 p-4">{error}</div>;
    
    const unpackedItems = trip.items.filter(item => !item.packed);
    const packedItems = trip.items.filter(item => item.packed);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
            <header className="mb-8 text-center border-b pb-4">
                 <div className="flex items-center justify-center gap-2 mb-2">
                    <Backpack className="w-8 h-8 text-indigo-500" />
                    <span className="text-xl font-bold">旅の荷造りAI</span>
                </div>
                <p className="text-gray-500">シェアされた旅行プラン</p>
            </header>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-800">{trip.destination}</h1>
                <p className="text-gray-500 mt-1 md:mt-0">{trip.numPeople}日での旅行</p>
            </div>
             <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg mb-8">
                <article className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{trip.summary || "アドバイスはありません。"}</ReactMarkdown></article>
            </div>
            <div className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 border-b-2 pb-2 border-gray-200">荷造りリスト</h2>
                {unpackedItems.map(item => <ItemRow key={item.name} item={item} isReadOnly={true} />)}
            </div>
            {packedItems.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-2xl font-semibold mb-4 border-b-2 pb-2 border-gray-200">準備完了の荷物</h2>
                    {packedItems.map(item => <ItemRow key={item.name} item={item} isReadOnly={true} />)}
                </div>
            )}
        </div>
    );
}

function ItemRow({ item, onTogglePacked, onUpdateQuantity, onDeleteItem, isReadOnly = false }) {
    return (
        <div className={`flex items-center gap-4 p-3 my-2 rounded-lg transition-shadow duration-200 shadow-sm ${item.packed ? 'bg-gray-100' : 'bg-white'}`}>
            <button 
                onClick={() => onTogglePacked(item.id, item.packed)}
                disabled={isReadOnly}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 
                    ${item.packed 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-300 hover:border-green-400'
                    }
                    disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:opacity-60`
                }
            >
                {item.packed && <Check className="w-4 h-4 text-white" />}
            </button>            
            <div className="w-12 h-12 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-md" /> : <ImageIcon className="w-6 h-6 text-gray-400" />}
            </div>
            
            <span className={`flex-grow font-medium ${item.packed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{item.name}</span>
            
            <div className="flex items-center gap-1 text-gray-600">
                {isReadOnly ? (
                    <span>x {item.quantity}</span>
                ) : (
                    <>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full">-</button>
                        <input type="number" value={item.quantity} readOnly={isReadOnly} onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value, 10))} className="w-12 text-center bg-transparent rounded-md border border-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none p-1" />
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full">+</button>
                    </>
                )}
            </div>
            
            {!isReadOnly && (
                <button onClick={() => onDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                    <Trash2 className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
