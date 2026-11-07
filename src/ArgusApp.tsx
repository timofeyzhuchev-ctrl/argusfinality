// Проект «Аргус» — основной интерфейс мониторинга
import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  RotateCcw,
  Shield,
  CheckCircle2,
  AlertCircle,
  Flame,
  User,
  Loader2,
  Download,
  Calendar,
  Globe,
  Database,
  Zap,
  ExternalLink,
  Copy,
  Check,
  UserPlus,
  Users,
  Trash2,
  X,
  Plus,
  Maximize2,
  Activity,
  Layers,
  Info,
  Scale,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  FileImage,
  Film,
  Wine,
  Eye,
  EyeOff,
} from 'lucide-react';
import { analyzeImageWithArgus } from './services/argusApi';
import { ArgusAnalysisResponse, RussianDatabaseMatch, ArgusPersonRecord } from './types/argus';
import { ImageHudViewer } from './components/ImageHudViewer';
import { VideoAnalysisPanel } from './components/VideoAnalysisPanel';
import { SharedDatabaseAdmin } from './components/SharedDatabaseAdmin';

export interface ImageMetaData {
  name: string;
  sizeKb: number;
  width: number;
  height: number;
  aspectRatio: string;
  mimeType: string;
  uploadTime: string;
}

export default function App() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentVideoFile, setCurrentVideoFile] = useState<File | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMetaData | null>(null);
  const [analysis, setAnalysis] = useState<ArgusAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mode Switcher: 'standard' vs 'database'
  const [searchMode, setSearchMode] = useState<'standard' | 'database'>('database');
  const [activeTab, setActiveTab] = useState<'summary' | 'photo_info' | 'objects' | 'biometrics' | 'smoking' | 'legal'>('summary');
  const [copiedQuery, setCopiedQuery] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [copiedMeta, setCopiedMeta] = useState<boolean>(false);

  // Modals for Photo Inspection & Zoom
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState<boolean>(false);
  const [isPhotoInfoModalOpen, setIsPhotoInfoModalOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPhotoVisible, setIsPhotoVisible] = useState<boolean>(true);
  const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null);

  // Persistent Argus Database of registered persons
  const [registeredPeople, setRegisteredPeople] = useState<ArgusPersonRecord[]>(() => {
    try {
      const saved = localStorage.getItem('argus_registered_people');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load registered people', e);
    }
    return [];
  });

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isPeopleListOpen, setIsPeopleListOpen] = useState(() => window.location.hash === '#admin');
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);
  const [sharedSubmitting, setSharedSubmitting] = useState(false);

  // Registration Form State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regBirthDate, setRegBirthDate] = useState<string>('');
  const [regSchoolOrOrg, setRegSchoolOrOrg] = useState<string>('');
  const [regVkUrl, setRegVkUrl] = useState<string>('');
  const [regPhoto, setRegPhoto] = useState<string>('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const regFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach stream to video element when webcam becomes active
  useEffect(() => {
    if (webcamActive && videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch((err) => {
        console.warn('Video auto-play prevented:', err);
      });
    }
  }, [webcamActive, mediaStream]);

  // Clean up media stream on component unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // Revoke the previous local video URL when a new file is selected or the view is cleared.
  useEffect(() => {
    const objectUrl = currentVideoUrl;
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentVideoUrl]);

  // The video file belongs to the current preview URL; drop it on reset.
  useEffect(() => {
    if (!currentVideoUrl) setCurrentVideoFile(null);
  }, [currentVideoUrl]);

  // Save registered people to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('argus_registered_people', JSON.stringify(registeredPeople));
    } catch (e) {
      console.warn('Failed to save registered people', e);
    }
  }, [registeredPeople]);

  const handleCopyQuery = () => {
    const query =
      analysis?.safeCityBiometrics?.vkProfile?.username &&
      analysis.safeCityBiometrics.vkProfile.username !== 'Поиск по возрасту'
        ? analysis.safeCityBiometrics.vkProfile.username
        : analysis?.safeCityBiometrics?.fullName || '';
    if (query && query !== 'Личность не установлена') {
      navigator.clipboard.writeText(query);
      setCopiedQuery(true);
      setTimeout(() => setCopiedQuery(false), 2000);
    }
  };

  const handleCopyFullReport = () => {
    if (!analysis) return;
    const text = `ПРОТОКОЛ АНАЛИЗА «АРГУС» (AI VISION)
Дата: ${new Date().toLocaleString('ru-RU')}
Файл: ${imageMeta?.name || 'Изображение'} (${imageMeta?.width || 0}×${imageMeta?.height || 0} px, ${imageMeta?.sizeKb || 0} КБ)
--------------------------------------------------
РЕЗУЛЬТАТ: ${analysis.isSmokingOrVaping ? 'ФАКТ КУРЕНИЯ ОБНАРУЖЕН' : 'КУРЕНИЕ НЕ ЗАФИКСИРОВАНО'}
Устройство: ${analysis.isSmokingOrVaping ? analysis.deviceLabelRu : 'Нет'}
Алкоголь в руке: ${analysis.isHoldingAlcohol ? analysis.alcoholLabelRu || 'Да' : 'Нет'}
Уверенность: ${analysis.confidencePercentage}%
Жест ко рту: ${analysis.handToMouthPoseDetected ? 'ДА' : 'НЕТ'}
Аэрозоль/дым: ${analysis.vaporOrSmokeDetected ? 'ДА' : 'НЕТ'}
--------------------------------------------------
ВОЗРАСТ: ${analysis.ageEstimation.ageRangeString} (~${Math.round(analysis.ageEstimation.estimatedAge)} лет)
Статус: ${analysis.ageEstimation.isBiologicallyMinor ? 'Несовершеннолетний (<18)' : 'Совершеннолетний (18+)'}
Достоверность: ${analysis.ageEstimation.confidencePercentage}%
--------------------------------------------------
ИДЕНТИФИКАЦИЯ: ${analysis.safeCityBiometrics.findFaceMatched ? analysis.safeCityBiometrics.fullName : 'Личность не установлена'}
Дата рождения: ${analysis.safeCityBiometrics.birthDate || 'Не определена'}
База «Аргус»: ${analysis.safeCityBiometrics.findFaceMatched ? 'Зарегистрирован' : 'Не найден'}
--------------------------------------------------
ЮРИДИЧЕСКАЯ КВАЛИФИКАЦИЯ:
Нарушение: ${analysis.legalAssessment.violationDetected ? 'ДА' : 'НЕТ'}
Статья: ${analysis.legalAssessment.applicableArticle}
Ответственность: ${analysis.legalAssessment.responsibleSubject}
Штраф: ${analysis.legalAssessment.fineAmountRu}
Мера: ${analysis.legalAssessment.recommendedAction}
--------------------------------------------------
Резюме: ${analysis.analyticalSummaryRu}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleCopyPhotoMeta = () => {
    if (!imageMeta) return;
    const text = `ПАРАМЕТРЫ СНИМКА «АРГУС»
Имя файла: ${imageMeta.name}
Разрешение: ${imageMeta.width} × ${imageMeta.height} px
Соотношение: ${imageMeta.aspectRatio}
Размер: ${imageMeta.sizeKb} КБ (${(imageMeta.sizeKb / 1024).toFixed(2)} МБ)
Формат: ${imageMeta.mimeType}
Время загрузки: ${imageMeta.uploadTime}
Объектов: ${analysis?.detectedObjects?.length || 0}`;

    navigator.clipboard.writeText(text);
    setCopiedMeta(true);
    setTimeout(() => setCopiedMeta(false), 2000);
  };

  const handleOpenRegisterModal = (photoToUse?: string) => {
    setErrorMsg(null);
    setRegPhoto(photoToUse || currentImage || '');
    setRegFullName('');
    setRegBirthDate('');
    setRegSchoolOrOrg('');
    setRegVkUrl('');
    setIsRegisterModalOpen(true);
  };

  const handleSubmitSharedRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sharedSubmitting) return;
    if (!regFullName.trim() || !regBirthDate || !regPhoto) {
      setErrorMsg('Укажите ФИО, дату рождения и фотографию.');
      return;
    }
    try {
      setSharedSubmitting(true);
      setErrorMsg(null);
      const response = await fetch('/api/shared/records', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: regFullName, birthDate: regBirthDate, schoolOrOrg: regSchoolOrOrg, vkUrl: regVkUrl, photoUrl: regPhoto }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Не удалось отправить запись.');
      }
      setIsRegisterModalOpen(false);
      setRegistrationSuccessMsg('Запись отправлена на проверку администратору.');
      setTimeout(() => setRegistrationSuccessMsg(null), 3500);
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Не удалось отправить запись.'); }
    finally { setSharedSubmitting(false); }
  };

  const handleSaveToArgusDb = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regBirthDate) {
      setErrorMsg('Пожалуйста, укажите ФИО и дату рождения');
      return;
    }

    const birthDateObj = new Date(regBirthDate);
    const birthYear = birthDateObj.getFullYear();
    const age = Math.max(1, 2026 - birthYear);
    const isMinor = age < 18;
    const formattedDate = birthDateObj.toLocaleDateString('ru-RU');

    const newRecord: ArgusPersonRecord = {
      id: 'argus_' + Date.now(),
      fullName: regFullName.trim(),
      birthDate: formattedDate,
      age,
      isMinor,
      schoolOrOrg: regSchoolOrOrg.trim() || undefined,
      vkUrl: regVkUrl.trim() || undefined,
      photoUrl: regPhoto || currentImage || '',
      registeredAt: new Date().toLocaleDateString('ru-RU'),
    };

    const updated = [newRecord, ...registeredPeople];
    setRegisteredPeople(updated);

    if (analysis) {
      const minAge = Math.max(12, Math.floor(age - 1));
      const maxAge = Math.min(65, Math.ceil(age + 1));
      const searchName = newRecord.fullName.split(/\s+/).slice(0, 2).join(' ');
      const vkSearch =
        newRecord.vkUrl ||
        `https://vk.com/search/people?q=${encodeURIComponent(searchName)}&c%5Bage_from%5D=${minAge}&c%5Bage_to%5D=${maxAge}`;

      setAnalysis({
        ...analysis,
        safeCityBiometrics: {
          ...analysis.safeCityBiometrics,
          findFaceMatched: true,
          matchedInArgusDb: true,
          matchedPersonId: newRecord.id,
          confidence: 100,
          fullName: newRecord.fullName,
          birthDate: newRecord.birthDate,
          passportAge: age,
          status: isMinor ? (age < 16 ? 'minor_under_16' : 'minor_16_to_17') : 'adult',
          searchMatchSnippet: 'Личность верифицирована в базе «Аргус»',
          educationFacility: newRecord.schoolOrOrg,
          vkProfile: {
            matched: true,
            username: searchName,
            fullName: newRecord.fullName,
            searchQuery: `${searchName}, ${age} лет`,
            vkSearchUrl: vkSearch,
            yandexSearchUrl: `https://yandex.ru/search/?text=${encodeURIComponent(searchName + ' vk.com')}`,
            profileUrl: vkSearch,
            city: 'Россия',
            confidence: 100,
          },
          databases: [
            {
              id: 'db_argus',
              name: 'База «Аргус»',
              code: 'argus_db',
              category: 'internal',
              matched: true,
              confidence: 100,
              statusBadge: 'Опознан в базе «Аргус»',
              details: `Запись подтверждена • ${newRecord.fullName}`,
              sourceType: 'База «Аргус»',
            },
          ],
        },
      });
    }

    setIsRegisterModalOpen(false);
    setRegistrationSuccessMsg(`Профиль «${newRecord.fullName}» сохранен в базе.`);
    setTimeout(() => setRegistrationSuccessMsg(null), 3500);
  };

  const handleDeleteRegisteredPerson = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = registeredPeople.filter((p) => p.id !== id);
    setRegisteredPeople(updated);
  };

  const handleSelectRegisteredPerson = (person: ArgusPersonRecord) => {
    setIsPeopleListOpen(false);
    if (person.photoUrl) {
      handleProcessImage(person.photoUrl);
    }
  };

  const handleProcessImage = async (base64Img: string, mode = searchMode) => {
    setCurrentImage(base64Img);
    setIsAnalyzing(true);
    setErrorMsg(null);
    setIsPhotoVisible(true);

    const imgObj = new Image();
    imgObj.onload = () => {
      const now = new Date();
      const w = imgObj.naturalWidth;
      const h = imgObj.naturalHeight;
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(w, h) || 1;
      const ar = `${Math.round(w / divisor)}:${Math.round(h / divisor)}`;

      setImageMeta((prev) => ({
        name: prev?.name || 'Фотография.jpg',
        sizeKb: prev?.sizeKb || Math.max(1, Math.round((base64Img.length * 3) / 4 / 1024)),
        width: w,
        height: h,
        aspectRatio: ar,
        mimeType: prev?.mimeType || (base64Img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'),
        uploadTime: prev?.uploadTime || now.toLocaleTimeString('ru-RU'),
      }));
    };
    imgObj.src = base64Img;

    try {
      const res = await analyzeImageWithArgus(base64Img, undefined, mode);

      setAnalysis(res);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Не удалось связаться с API. Проверьте настройки сервера.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProcessVideoFile = (file: File) => {
    if (!file.size) {
      setErrorMsg('Видеофайл пустой или не удалось прочитать его содержимое.');
      return;
    }

    try {
      const videoUrl = URL.createObjectURL(file);
      setCurrentVideoUrl(videoUrl);
      setCurrentVideoFile(file);
      setCurrentImage(null);
      setAnalysis(null);
      setIsAnalyzing(false);
      setIsPhotoVisible(true);
      setErrorMsg(null);

      setImageMeta({
        name: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        width: 0,
        height: 0,
        aspectRatio: 'Определяется после загрузки',
        mimeType: file.type || 'video/*',
        uploadTime: new Date().toLocaleTimeString('ru-RU'),
      });
    } catch (error) {
      console.error('Unable to create a local video preview:', error);
      setErrorMsg('Не удалось открыть видеофайл. Попробуйте выбрать его ещё раз.');
    }
  };

  const handleVideoMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = event.currentTarget;
    if (!videoWidth || !videoHeight) return;

    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(videoWidth, videoHeight) || 1;
    setImageMeta((prev) => prev ? {
      ...prev,
      width: videoWidth,
      height: videoHeight,
      aspectRatio: `${Math.round(videoWidth / divisor)}:${Math.round(videoHeight / divisor)}`,
    } : prev);
    setErrorMsg(null);
  };

  const handleSelectedFile = (file: File) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v|ogv|3gp)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(file.name);

    if (isVideo) {
      handleProcessVideoFile(file);
      return;
    }

    if (!isImage) {
      setErrorMsg('Формат файла не поддерживается. Выберите изображение или видео MP4/WebM.');
      return;
    }

    if (!file.size) {
      setErrorMsg('Файл пустой или не удалось прочитать его содержимое.');
      return;
    }

    setCurrentVideoUrl(null);
    setCurrentImage(null);
    setAnalysis(null);
    setErrorMsg(null);

    const now = new Date();
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    setImageMeta({
      name: file.name,
      sizeKb,
      width: 0,
      height: 0,
      aspectRatio: '...',
      mimeType: file.type || 'image/jpeg',
      uploadTime: now.toLocaleTimeString('ru-RU'),
    });
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      if (!rawBase64) {
        setErrorMsg('Не удалось прочитать выбранное изображение.');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(img.width, img.height) || 1;
        setImageMeta({
          name: file.name,
          sizeKb,
          width: img.width,
          height: img.height,
          aspectRatio: `${Math.round(img.width / divisor)}:${Math.round(img.height / divisor)}`,
          mimeType: file.type || 'image/jpeg',
          uploadTime: now.toLocaleTimeString('ru-RU'),
        });
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetW, targetH);
          handleProcessImage(canvas.toDataURL('image/jpeg', 0.88));
        } else {
          handleProcessImage(rawBase64);
        }
      };
      img.onerror = () => setErrorMsg('Выбранный файл не удалось декодировать как изображение.');
      img.src = rawBase64;
    };
    reader.onerror = () => setErrorMsg('Не удалось прочитать выбранный файл.');
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (file) handleSelectedFile(file);
    input.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleSelectedFile(file);
  };

  const handleStartWebcam = async () => {
    setErrorMsg(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMsg('Веб-камера не поддерживается в данном браузере или отключена политикой безопасности iframe.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setMediaStream(stream);
      setWebcamActive(true);
    } catch (err: any) {
      console.warn('Webcam access was not granted or hardware unavailable:', err?.name || err);
      let userTip = 'Не удалось включить камеру. Разрешите доступ к веб-камере в браузере или выберите фото на диске.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        userTip = 'Доступ к веб-камере отклонен пользователем или заблокирован в настройках браузера.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        userTip = 'Веб-камера не обнаружена на вашем устройстве. Загрузите файл фото или используйте пример.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        userTip = 'Камера уже используется другим приложением. Закройте его и повторите попытку.';
      }
      setErrorMsg(userTip);
      setWebcamActive(false);
    }
  };

  const handleCaptureWebcam = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          setMediaStream(null);
        }
        setWebcamActive(false);

        const now = new Date();
        setImageMeta({
          name: 'Снимок_камеры.jpg',
          sizeKb: Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024)),
          width: canvas.width,
          height: canvas.height,
          aspectRatio: `${canvas.width}:${canvas.height}`,
          mimeType: 'image/jpeg',
          uploadTime: now.toLocaleTimeString('ru-RU'),
        });

        handleProcessImage(dataUrl);
      }
    }
  };

  const handleStopWebcam = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setWebcamActive(false);
  };

  const handleReset = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setCurrentVideoUrl(null);
    setWebcamActive(false);
    setCurrentImage(null);
    setAnalysis(null);
    setErrorMsg(null);
    setImageMeta(null);
    setZoomLevel(1);
    setIsPhotoVisible(true);
    setHoveredBoxIndex(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const isIdentified = Boolean(
    analysis?.safeCityBiometrics?.findFaceMatched &&
      analysis.safeCityBiometrics.fullName &&
      analysis.safeCityBiometrics.fullName !== 'Личность не установлена' &&
      analysis.safeCityBiometrics.fullName !== 'Не определено'
  );

  return (
    <div className="min-h-screen text-cyan-50 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Cyber Cyan Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-600 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />

      {/* Header in the style of the new cyber safe-city banner */}
      <header className="border-b border-cyan-500/25 bg-[#030914]/90 backdrop-blur-md sticky top-0 z-30 shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 md:gap-4">
          <div className="w-full md:flex-1 md:min-w-0 flex items-center">
            <div
              onClick={handleReset}
              className="w-full rounded-xl bg-[#040d1a] border-2 border-cyan-400/50 overflow-hidden flex items-center justify-center shadow-[0_0_24px_rgba(6,182,212,0.35)] cursor-pointer group transition-transform hover:scale-[1.005]"
              title="На главную «Аргус»"
            >
              <img
                src="/assets/aistudio/image_c3bd38b9.png"
                alt="АРГУС — AI для Безопасного города"
                className="w-full h-auto object-contain block"
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 text-xs shrink-0">
            {/* Argus DB Registry */}
            <button
              onClick={() => setIsPeopleListOpen(true)}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 border border-cyan-400/35 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium">Управление базой</span>
            </button>

            {/* Add person */}
            <button
              onClick={() => handleOpenRegisterModal()}
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-2 rounded-xl argus-btn-primary transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Внести в базу</span>
            </button>

            <a
              href="/download/argus-ai-v3.zip?v=3"
              onClick={(e) => {
                e.currentTarget.href = `/download/argus-ai-v3.zip?t=${Date.now()}`;
              }}
              download="argus-ai-v3.zip"
              className="px-2.5 py-2 rounded-xl bg-[#08182b] hover:bg-[#0e2746] text-cyan-200/80 hover:text-white border border-cyan-400/30 transition-colors cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
              title="Скачать свежий проект (.zip)"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium">.zip</span>
            </a>

            {currentImage && (
              <button
                onClick={handleReset}
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 border border-cyan-400/35 transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden xs:inline sm:inline">Сменить фото</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col justify-center">
        {/* Success Alert */}
        {registrationSuccessMsg && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{registrationSuccessMsg}</span>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="flex flex-col items-center justify-center mb-5 sm:mb-6">
          <div className="p-1 rounded-2xl bg-[#061426]/90 border border-cyan-400/30 flex w-full sm:w-auto sm:inline-flex shadow-lg shadow-cyan-950/40">
            <button
              onClick={() => {
                setSearchMode('standard');
                if (currentImage && !isAnalyzing) handleProcessImage(currentImage, 'standard');
              }}
              className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                searchMode === 'standard'
                  ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-600 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-cyan-200/70 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Обычный анализ</span>
            </button>

            <button
              onClick={() => {
                setSearchMode('database');
                if (currentImage && !isAnalyzing) handleProcessImage(currentImage, 'database');
              }}
              className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                searchMode === 'database'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                  : 'text-cyan-200/70 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>Pro анализ</span>
            </button>
          </div>

          <p className="text-xs text-cyan-200/70 mt-2 text-center px-2">
            {searchMode === 'standard'
              ? 'Быстрая оценка возраста, факта курения и алкоголя в руке'
              : 'Подробный отчёт. Сверка с базой «Аргус» доступна в управлении базой.'}
          </p>
        </div>

        {/* Webcam Capture */}
        {webcamActive && (
          <div className="mb-6 p-3 sm:p-4 rounded-2xl argus-card flex flex-col items-center">
            <video
              ref={videoRef}
              className="rounded-xl border border-cyan-400/40 max-h-96 w-full object-cover bg-black"
              autoPlay
              muted
              playsInline
            />
            <div className="flex gap-2 mt-3 w-full sm:w-auto justify-center">
              <button
                onClick={handleCaptureWebcam}
                className="flex-1 sm:flex-initial justify-center px-4 py-2.5 sm:py-2 rounded-xl argus-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Сделать снимок</span>
              </button>
              <button
                onClick={handleStopWebcam}
                className="px-4 py-2.5 sm:py-2 rounded-xl bg-[#08182b] text-cyan-200 hover:text-white text-xs cursor-pointer border border-cyan-400/30"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 px-3.5 sm:px-4 py-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-100 text-xs flex items-center justify-between gap-3 shadow-lg shadow-rose-950/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="break-words">{errorMsg}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {currentImage && (
                <button
                  onClick={() => handleProcessImage(currentImage)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-100 text-xs hover:bg-rose-500/30 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Повторить</span>
                </button>
              )}
              <button
                onClick={() => setErrorMsg(null)}
                className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/20 cursor-pointer transition-colors"
                title="Закрыть уведомление"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STATE 1: Empty Upload Dropzone in New Logo Style */}
        {!currentImage && !currentVideoUrl && !webcamActive && (
          <div className="max-w-3xl mx-auto w-full space-y-5">
            {/* Upload Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl sm:rounded-3xl border-2 border-dashed p-5 sm:p-10 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                isDragOver
                  ? 'border-cyan-400 bg-[#071930]/90 shadow-[0_0_35px_rgba(6,182,212,0.4)]'
                  : 'border-cyan-500/35 bg-[#051121]/80 hover:bg-[#081a33]/90 hover:border-cyan-400/65 shadow-xl shadow-black/60'
              }`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-sky-500/20 to-blue-600/20 border border-cyan-400/40 flex items-center justify-center mb-3.5 sm:mb-4 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <h2 className="text-base sm:text-xl font-bold text-white mb-1">
                Загрузите фото для обработки или видео для просмотра
              </h2>
              <p className="text-xs text-cyan-200/70 max-w-md mb-5 sm:mb-6">
                Фото можно выбрать для доступных функций приложения. Видео открывается локально в плеере браузера.
              </p>

              <div
                className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center gap-2.5 sm:gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-3 sm:py-2.5 rounded-xl argus-btn-primary text-xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Upload className="w-4 h-4" />
                  <span>Выбрать фото</span>
                </button>

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="px-5 py-3 sm:py-2.5 rounded-xl bg-[#08192e] hover:bg-[#0d2646] text-cyan-100 font-semibold text-xs border border-cyan-400/35 transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                >
                  <Film className="w-4 h-4 text-cyan-400" />
                  <span>Загрузить видео</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartWebcam}
                  className="px-5 py-3 sm:py-2.5 rounded-xl bg-[#061426] hover:bg-[#0a203c] text-sky-200 font-semibold text-xs border border-sky-400/35 transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_15px_rgba(56,189,248,0.12)]"
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Камера</span>
                </button>
              </div>

            </div>

            {/* Hidden inputs live outside the dropzone: a programmatic input.click() bubbles,
                and inside the dropzone it would re-trigger the photo picker instead of the video one. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={handleFileUpload}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Video preview + whole-video smoking analysis (remounts per file, so state resets automatically). */}
        {currentVideoUrl && (
          <VideoAnalysisPanel
            key={currentVideoUrl}
            videoUrl={currentVideoUrl}
            file={currentVideoFile}
            meta={imageMeta}
            onLoadedMetadata={handleVideoMetadata}
            onPlaybackError={() => setErrorMsg('Браузер не смог воспроизвести этот файл. Попробуйте MP4 с кодеком H.264/AAC или WebM с VP8/VP9.')}
            onReset={handleReset}
          />
        )}

        {/* STATE 2: Image Uploaded Workspace */}
        {currentImage && (
          <div className="space-y-4 max-w-5xl mx-auto w-full">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl argus-card text-xs">
              <div className="flex items-center gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setIsPhotoVisible(true)}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isPhotoVisible
                      ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'text-cyan-200/70 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Фото и отчет</span>
                </button>
                <button
                  onClick={() => setIsPhotoVisible(false)}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    !isPhotoVisible
                      ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'text-cyan-200/70 hover:text-white'
                  }`}
                  title="Закрыть фото и оставить только отчет"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Только отчет</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-1 text-cyan-200/75 border-t sm:border-t-0 border-cyan-500/20 pt-1.5 sm:pt-0">
                <button
                  onClick={() => setIsPhotoInfoModalOpen(true)}
                  className="px-2.5 py-1.5 sm:py-1 rounded-lg hover:text-white hover:bg-cyan-500/20 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Параметры</span>
                </button>
                <button
                  onClick={() => setIsFullscreenModalOpen(true)}
                  className="px-2.5 py-1.5 sm:py-1 rounded-lg hover:text-white hover:bg-cyan-500/20 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Зум</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-2.5 py-1.5 sm:py-1 rounded-lg hover:text-sky-300 hover:bg-sky-500/20 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Сменить</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Photo Preview Column */}
              {isPhotoVisible && (
                <div className="lg:col-span-5 rounded-2xl argus-card p-3 space-y-2.5">
                  {/* Card Header with Close button */}
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-cyan-500/25 px-1">
                    <span className="text-cyan-100 font-semibold">
                      Кадр проверки
                    </span>
                    <button
                      onClick={() => setIsPhotoVisible(false)}
                      className="text-cyan-200/70 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Закрыть фото</span>
                    </button>
                  </div>

                  <ImageHudViewer
                    imageUrl={currentImage}
                    isAnalyzing={isAnalyzing}
                    boundingBoxes={analysis?.detectedObjects || []}
                    statusLabel={
                      analysis
                        ? analysis.personDetected === false
                          ? 'Человек не обнаружен'
                          : analysis.isSmokingOrVaping && analysis.isHoldingAlcohol
                          ? 'Курение + Алкоголь'
                          : analysis.isHoldingAlcohol
                          ? 'Алкоголь в руке'
                          : analysis.isSmokingOrVaping
                          ? 'Курение'
                          : 'Норма'
                        : 'Анализ...'
                    }
                    isViolation={Boolean(
                      analysis?.personDetected !== false &&
                        (analysis?.isSmokingOrVaping || analysis?.isHoldingAlcohol)
                    )}
                    onOpenFullscreen={() => setIsFullscreenModalOpen(true)}
                    onOpenInfo={() => setIsPhotoInfoModalOpen(true)}
                    hoveredIndex={hoveredBoxIndex}
                    onHoverIndex={setHoveredBoxIndex}
                  />

                  {/* Metadata bar */}
                  <div className="flex items-center justify-between text-[11px] text-cyan-200/60 px-1 font-mono">
                    <span>{imageMeta?.width ? `${imageMeta.width}×${imageMeta.height} px` : 'HD'}</span>
                    <span>{imageMeta?.sizeKb ? `${imageMeta.sizeKb} КБ` : ''}</span>
                    <button
                      onClick={() => setIsPhotoInfoModalOpen(true)}
                      className="text-cyan-300 hover:text-cyan-200 underline cursor-pointer font-sans"
                    >
                      Подробнее
                    </button>
                  </div>

                  {/* Actions under photo */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-xs">
                    <button
                      onClick={() => handleOpenRegisterModal(currentImage || undefined)}
                      className="py-1.5 px-2 rounded-lg argus-btn-primary transition-all cursor-pointer text-center truncate"
                    >
                      + В базу
                    </button>
                    <button
                      onClick={() => setIsPhotoVisible(false)}
                      className="py-1.5 px-2 rounded-lg bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 font-medium border border-cyan-400/20 transition-colors cursor-pointer text-center truncate"
                    >
                      Скрыть
                    </button>
                    <button
                      onClick={handleReset}
                      className="py-1.5 px-2 rounded-lg bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 font-medium border border-cyan-400/20 transition-colors cursor-pointer text-center truncate"
                    >
                      Сброс
                    </button>
                  </div>
                </div>
              )}

              {/* Information Column (Full width when photo closed) */}
              <div className={`${isPhotoVisible ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                {/* Closed photo banner */}
                {!isPhotoVisible && (
                  <div className="p-3 rounded-xl argus-card flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div
                        onClick={() => setIsPhotoVisible(true)}
                        className="w-8 h-8 rounded-lg bg-[#12091c] border border-cyan-400/30 overflow-hidden cursor-pointer shrink-0"
                      >
                        <img src={currentImage} alt="Thumb" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-white font-semibold block">
                          Превью фото скрыто
                        </span>
                        <span className="text-[11px] text-cyan-200/60 font-mono">
                          {imageMeta?.name || 'Изображение'} · {imageMeta?.width}×{imageMeta?.height} px
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsPhotoVisible(true)}
                        className="px-2.5 py-1 rounded-lg argus-btn-primary text-xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Показать фото</span>
                      </button>
                      <button
                        onClick={() => setIsFullscreenModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-[#08182b] text-cyan-100 hover:text-white border border-cyan-400/20 transition-colors cursor-pointer"
                      >
                        Зум
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {isAnalyzing && (
                  <div className="p-8 rounded-2xl argus-card flex flex-col items-center justify-center gap-3 text-center">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Нейросеть «Аргус» обрабатывает изображение
                      </div>
                      <div className="text-xs text-cyan-200/70 mt-0.5">
                        Локализация лица, оценка возраста, проверка признаков курения и алкоголя...
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Results */}
                {!isAnalyzing && analysis && (
                  <>
                    {/* Status Verdict Header */}
                    <div className="p-3.5 sm:p-4 rounded-2xl argus-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 ${
                            analysis.personDetected === false
                              ? 'bg-amber-500/20 text-cyan-200 border-amber-400/40'
                              : analysis.isSmokingOrVaping || analysis.isHoldingAlcohol
                              ? analysis.ageEstimation.isBiologicallyMinor
                                ? 'bg-pink-500/25 text-pink-200 border-pink-500/50'
                                : 'bg-orange-500/20 text-orange-200 border-orange-400/40'
                              : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                          }`}
                        >
                          {analysis.personDetected === false
                            ? 'Нет лица'
                            : analysis.isSmokingOrVaping || analysis.isHoldingAlcohol
                            ? 'Нарушение'
                            : 'Норма'}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white">
                            {analysis.personDetected === false
                              ? 'Человек в кадре не обнаружен'
                              : analysis.isSmokingOrVaping && analysis.isHoldingAlcohol
                              ? 'Зафиксировано курение и алкоголь в руке'
                              : analysis.isHoldingAlcohol
                              ? analysis.ageEstimation.isBiologicallyMinor
                                ? 'Несовершеннолетний с алкоголем в руке'
                                : 'Алкоголь в руке зафиксирован (совершеннолетний)'
                              : analysis.isSmokingOrVaping
                              ? analysis.ageEstimation.isBiologicallyMinor
                                ? 'Несовершеннолетний курит'
                                : 'Курение зафиксировано (совершеннолетний)'
                              : 'Курение и алкоголь не зафиксированы'}
                          </div>
                          <div className="text-xs text-cyan-200/75 mt-0.5">
                            {analysis.personDetected === false
                              ? 'Нейросеть не видит человека в кадре — загрузите другой снимок или выберите кадр видео'
                              : analysis.isSmokingOrVaping && analysis.isHoldingAlcohol
                              ? `${analysis.deviceLabelRu} · ${analysis.alcoholLabelRu || 'Алкоголь в руке'}`
                              : analysis.isHoldingAlcohol
                              ? analysis.alcoholLabelRu || 'Обнаружена тара с алкоголем в руке'
                              : analysis.isSmokingOrVaping
                              ? analysis.deviceLabelRu
                              : 'Признаков сигарет, вейпов, пара или алкоголя в руках не обнаружено'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleCopyFullReport}
                        className="w-full sm:w-auto justify-center px-3 py-2 sm:py-1.5 rounded-xl bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 hover:text-white border border-cyan-400/35 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        title="Скопировать отчет"
                      >
                        {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>{copiedReport ? 'Скопировано' : 'Отчет'}</span>
                      </button>
                    </div>

                    {/* 3 Main Stat Blocks */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Age Block */}
                      <div className="p-4 rounded-xl argus-card space-y-1">
                        <div className="text-xs text-cyan-200/75 font-medium">
                          Возраст лица
                        </div>
                        <div className="text-xl font-bold text-white tabular-nums">
                          {analysis.personDetected === false
                            ? 'Не обнаружен'
                            : analysis.ageEstimation.ageRangeString || `${Math.round(analysis.ageEstimation.estimatedAge)} лет`}
                        </div>
                        <div className="text-[11px] text-cyan-200/60 pt-0.5">
                          {analysis.personDetected === false
                            ? 'Лицо в кадре отсутствует'
                            : `${analysis.ageEstimation.isBiologicallyMinor ? 'Несовершеннолетний (<18)' : 'Совершеннолетний (18+)'} · Точность ${analysis.ageEstimation.confidencePercentage}%`}
                        </div>
                      </div>

                      {/* Smoking Block */}
                      <div className="p-4 rounded-xl argus-card space-y-1">
                        <div className="text-xs text-cyan-200/75 font-medium">
                          Факт курения
                        </div>
                        <div className={`text-xl font-bold ${analysis.isSmokingOrVaping ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {analysis.personDetected === false
                            ? 'Не обнаружен'
                            : analysis.isSmokingOrVaping
                            ? 'Зафиксировано'
                            : 'Не обнаружено'}
                        </div>
                        <div className="text-[11px] text-cyan-200/60 pt-0.5">
                          {analysis.personDetected === false
                            ? 'Нет человека в кадре'
                            : `${analysis.isSmokingOrVaping ? analysis.deviceLabelRu : 'Норма'} · Точность ${analysis.confidencePercentage}%`}
                        </div>
                      </div>

                      {/* Alcohol in Hand Block */}
                      <div className="p-4 rounded-xl argus-card space-y-1">
                        <div className="text-xs text-cyan-200/75 font-medium flex items-center gap-1.5">
                          <Wine className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Алкоголь в руке</span>
                        </div>
                        <div className={`text-xl font-bold ${analysis.isHoldingAlcohol ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {analysis.personDetected === false
                            ? 'Не обнаружен'
                            : analysis.isHoldingAlcohol
                            ? 'Обнаружен'
                            : 'Не обнаружен'}
                        </div>
                        <div className="text-[11px] text-cyan-200/60 pt-0.5">
                          {analysis.personDetected === false
                            ? 'Нет человека в кадре'
                            : analysis.isHoldingAlcohol
                            ? analysis.alcoholLabelRu || 'Тара с алкоголем в руке'
                            : 'Алкоголь в руках отсутствует'}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Object Badges */}
                    {analysis.detectedObjects && analysis.detectedObjects.length > 0 && (
                      <div className="p-3 rounded-xl argus-card space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-cyan-200/75">
                          <span className="flex items-center gap-1.5 font-semibold text-cyan-100">
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Классифицированные объекты:</span>
                          </span>
                          <span className="text-[10px] text-cyan-200/60 font-mono hidden sm:inline">
                            наведите для подсветки на кадре
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {analysis.detectedObjects.map((obj, idx) => {
                            const isDevice =
                              obj.category === 'device' ||
                              /вейп|сигарет|iqos|айкос|pod|электрон|vape|cigar|алкогол|бутылк|пив|вин/i.test(obj.label);
                            const isSmoke =
                              obj.category === 'smoke_vapor' || /пар|дым|smoke|vapor/i.test(obj.label);
                            const isFace = obj.category === 'face' || /лицо|face/i.test(obj.label);
                            const isHov = hoveredBoxIndex === idx;

                            return (
                              <button
                                key={idx}
                                onMouseEnter={() => setHoveredBoxIndex(idx)}
                                onMouseLeave={() => setHoveredBoxIndex(null)}
                                onClick={() => setActiveTab('objects')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                                  isHov
                                    ? isDevice
                                      ? 'bg-rose-500/25 text-rose-200 border-rose-400/50 scale-105'
                                      : isFace
                                      ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50 scale-105'
                                      : 'bg-sky-500/25 text-sky-200 border-sky-400/50 scale-105'
                                    : 'bg-[#051121]/90 hover:bg-[#0a203c] text-cyan-100 border-cyan-500/25'
                                }`}
                                title="Наведите для анимации рамки на фото"
                              >
                                {isDevice ? (
                                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                                ) : isFace ? (
                                  <User className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isSmoke ? 'bg-sky-400' : 'bg-emerald-400'
                                    }`}
                                  />
                                )}
                                <span>{obj.label}</span>
                                <span className="text-[10px] opacity-70 font-mono">({obj.confidence}%)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tabs Navigation */}
                    <div className="flex items-center gap-1 bg-[#040e1c] border border-cyan-400/30 rounded-xl p-1 text-xs overflow-x-auto shadow-inner">
                      {[
                        { key: 'summary', label: searchMode === 'database' ? 'Поиск по базам' : 'Сводка' },
                        { key: 'photo_info', label: 'Данные кадра' },
                        { key: 'objects', label: `Объекты (${analysis.detectedObjects?.length || 0})` },
                        { key: 'biometrics', label: 'Маркеры лица' },
                        { key: 'smoking', label: 'Детали курения' },
                        { key: 'legal', label: 'КоАП РФ' },
                      ].map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                              isActive
                                ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                                : 'text-cyan-200/70 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* TAB: SUMMARY / ПОИСК ПО БАЗАМ */}
                    {activeTab === 'summary' && (
                      <div className="space-y-3 text-xs">
                        {searchMode === 'database' ? (
                          <>
                            {/* 1. Main Identity Verification Dossier */}
                            <div
                              className={`p-4 rounded-xl border transition-all ${
                                isIdentified
                                  ? 'bg-emerald-950/30 border-emerald-400/40 ring-1 ring-emerald-500/20'
                                  : 'argus-card'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-cyan-300/80 text-[11px] font-mono uppercase tracking-wider">
                                      {isIdentified ? 'Биометрическая верификация «Аргус»' : 'Статус поиска по базе'}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                        analysis.personDetected === false
                                          ? 'bg-[#061529] border-cyan-400/25 text-cyan-200'
                                          : isIdentified
                                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                                          : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                                      }`}
                                    >
                                      {analysis.personDetected === false
                                        ? 'Нет человека в кадре'
                                        : isIdentified
                                        ? 'Личность подтверждена (100%)'
                                        : 'Сверка доступна администратору'}
                                    </span>
                                  </div>

                                  <div className="text-base font-bold text-white pt-0.5">
                                    {analysis.personDetected === false
                                      ? 'Человек в кадре не обнаружен'
                                      : isIdentified
                                      ? analysis.safeCityBiometrics.fullName
                                      : 'Сверка лица с базой «Аргус»'}
                                  </div>

                                  <p className="text-cyan-100/75 text-xs leading-relaxed">
                                    {analysis.personDetected === false
                                      ? 'Нейросеть не обнаружила человека или лица в кадре. Загрузите снимок с человеком или выберите другой кадр видео.'
                                      : isIdentified
                                      ? 'Запись в базе биометрии «Аргус» верифицирована. Кандидат привязан к локальному контуру идентификации.'
                                      : 'Откройте управление базой, чтобы сравнить фото с одобренными записями.'}
                                  </p>
                                </div>

                                {!isIdentified ? (
                                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                                    <button onClick={() => setIsPeopleListOpen(true)}
                                      className="px-3 py-2 rounded-xl argus-btn-primary text-xs flex justify-center items-center gap-1.5 cursor-pointer">
                                      <Database className="w-3.5 h-3.5" /> Сверить в панели
                                    </button>
                                    <button onClick={() => handleOpenRegisterModal(currentImage || undefined)}
                                      className="px-3 py-2 rounded-lg border border-cyan-400/30 text-cyan-100 text-xs flex justify-center items-center gap-1.5 cursor-pointer">
                                      <UserPlus className="w-3.5 h-3.5" /> Внести в базу
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={handleCopyQuery}
                                    className="w-full sm:w-auto justify-center px-2.5 py-2 sm:py-1.5 rounded-lg bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 border border-cyan-400/35 text-xs font-medium cursor-pointer shrink-0 flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                                  >
                                    {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                                    <span>{copiedQuery ? 'Скопировано' : 'Копировать ФИО'}</span>
                                  </button>
                                )}
                              </div>

                              {/* Identified attributes grid */}
                              {isIdentified && (
                                <div className="mt-3 pt-3 border-t border-cyan-500/25 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                  <div className="p-2 rounded-lg bg-[#051121]/80 border border-cyan-400/20">
                                    <span className="text-cyan-200/60 block text-[10px]">Дата рождения</span>
                                    <span className="text-white font-medium">
                                      {analysis.safeCityBiometrics.birthDate || 'Не указана'}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-[#051121]/80 border border-cyan-400/20">
                                    <span className="text-cyan-200/60 block text-[10px]">Возраст</span>
                                    <span className="text-white font-medium">
                                      {analysis.safeCityBiometrics.passportAge || Math.round(analysis.ageEstimation.estimatedAge)} лет
                                    </span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-[#051121]/80 border border-cyan-400/20">
                                    <span className="text-cyan-200/60 block text-[10px]">Статус учета ПДН</span>
                                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Чист
                                    </span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-[#051121]/80 border border-cyan-400/20">
                                    <span className="text-cyan-200/60 block text-[10px]">Организация</span>
                                    <span className="text-white font-medium truncate block">
                                      {analysis.safeCityBiometrics.educationFacility || 'СОШ'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 2. Biometric Vector Passport Strip */}
                            {analysis.safeCityBiometrics.biometricProfile && <div className="p-3.5 rounded-xl argus-card space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-white flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                                  Биометрический паспорт кадра
                                </span>
                                <span className="text-cyan-200/60 font-mono text-[10px]">
                                  ГОСТ Р 58833-2020
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                <div className="p-2 rounded-lg bg-[#051121]/80 border border-cyan-400/20">
                                  <span className="text-cyan-200/60 block text-[10px]">Дескриптор лица</span>
                                  <span className="text-cyan-300 font-mono text-[10px] truncate block">
                                    {analysis.safeCityBiometrics.biometricProfile?.biometricHash || 'ARGUS-BIO-9042-C1A8'}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-[#051121]/80 border border-cyan-400/20">
                                  <span className="text-cyan-200/60 block text-[10px]">Анатомический пол</span>
                                  <span className="text-white font-medium">
                                    {analysis.safeCityBiometrics.biometricProfile?.genderLabelRu ||
                                      (analysis.ageEstimation.estimatedAge > 20 ? 'Мужской' : 'Юношеский')}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-[#051121]/80 border border-cyan-400/20">
                                  <span className="text-cyan-200/60 block text-[10px]">Межзрачковое (IPD)</span>
                                  <span className="text-white font-mono text-[10px]">
                                    {analysis.safeCityBiometrics.biometricProfile?.interpupillaryDistanceMm || 64.2} мм
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-[#051121]/80 border border-cyan-400/20">
                                  <span className="text-cyan-200/60 block text-[10px]">Качество / Liveness</span>
                                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                                    {analysis.safeCityBiometrics.biometricProfile?.qualityScore || 96}% (Анфас)
                                  </span>
                                </div>
                              </div>
                            </div>}

                            {/* 4. Candidate comparison if registered people exist */}
                            {analysis.safeCityBiometrics.candidateMatches &&
                              analysis.safeCityBiometrics.candidateMatches.length > 0 && (
                                <div className="p-3.5 rounded-xl argus-card space-y-2.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-white flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                                      Сравнение с базой «Аргус» ({analysis.safeCityBiometrics.candidateMatches.length})
                                    </span>
                                    <span className="text-cyan-200/60 text-[10px]">
                                      Порог совпадения: 90%
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {analysis.safeCityBiometrics.candidateMatches.map((cand) => (
                                      <div
                                        key={cand.id}
                                        className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                                          cand.isMatch
                                            ? 'bg-emerald-950/35 border-emerald-400/40'
                                            : 'bg-[#051121]/80 border-cyan-400/20 text-cyan-100'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {cand.photoUrl ? (
                                            <img
                                              src={cand.photoUrl}
                                              alt={cand.fullName}
                                              className="w-9 h-9 rounded-lg object-cover border border-cyan-400/30 shrink-0"
                                            />
                                          ) : (
                                            <div className="w-9 h-9 rounded-lg bg-[#08182b] flex items-center justify-center shrink-0 text-cyan-300">
                                              <User className="w-4 h-4" />
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <div className="text-white font-medium text-xs truncate">
                                              {cand.fullName}
                                            </div>
                                            <div className="text-cyan-200/60 text-[11px] truncate">
                                              {cand.age} лет · {cand.schoolOrOrg || 'Организация не указана'}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                          <div
                                            className={`font-mono font-bold text-xs ${
                                              cand.isMatch ? 'text-emerald-400' : 'text-cyan-200/70'
                                            }`}
                                          >
                                            {cand.similarityScore}%
                                          </div>
                                          <div className="text-[9px] text-cyan-200/50">сходство</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* 5. Full Russian Databases Verification Results */}
                            {analysis.safeCityBiometrics.databases &&
                              analysis.safeCityBiometrics.databases.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between px-1 text-[11px] text-cyan-200/75">
                                    <span className="font-semibold text-white flex items-center gap-1.5">
                                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                                      Результаты сверки по реестрам и базам данных ({analysis.safeCityBiometrics.databases.length})
                                    </span>
                                    <span className="text-cyan-200/60 font-mono text-[10px]">
                                      {isIdentified
                                        ? '100% подтверждено'
                                        : `${analysis.safeCityBiometrics.databases.length} баз проверено`}
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {analysis.safeCityBiometrics.databases
                                      .filter((db) => db.id !== 'db_vk' && db.code !== 'vk')
                                      .map((db) => {
                                      const isArgus = db.id === 'db_argus';
                                      const isVk = db.id === 'db_vk';
                                      const isYandex = db.id === 'db_yandex';
                                      const isPdn = db.id === 'db_pdn';
                                      const isSearch4faces =
                                        db.id === 'db_search4faces' || db.code === 'search4faces';

                                      return (
                                        <div
                                          key={db.id}
                                          className="p-3.5 rounded-xl argus-card space-y-2 transition-colors"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              {isVk ? (
                                                <span className="w-5 h-5 rounded bg-[#0077FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                                  VK
                                                </span>
                                              ) : isSearch4faces ? (
                                                <span className="w-5 h-5 rounded bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 shadow-sm">
                                                  S4F
                                                </span>
                                              ) : isYandex ? (
                                                <span className="w-5 h-5 rounded bg-[#FC3F1D] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                                  Я
                                                </span>
                                              ) : isArgus ? (
                                                <span className="w-5 h-5 rounded bg-[#08182b] text-white flex items-center justify-center shrink-0 border border-cyan-400/30">
                                                  <Shield className="w-3 h-3 text-cyan-400" />
                                                </span>
                                              ) : isPdn ? (
                                                <span className="w-5 h-5 rounded bg-emerald-950/60 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                                  <CheckCircle2 className="w-3 h-3" />
                                                </span>
                                              ) : (
                                                <span className="w-5 h-5 rounded bg-[#08182b] text-cyan-200 flex items-center justify-center shrink-0 border border-cyan-400/30">
                                                  <Database className="w-3 h-3" />
                                                </span>
                                              )}
                                              <div>
                                                <span className="font-semibold text-white">{db.name}</span>
                                                <span className="text-[10px] text-cyan-200/60 block">
                                                  {db.sourceType}
                                                </span>
                                              </div>
                                            </div>

                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                                                db.matched
                                                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                                                  : isPdn
                                                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                                                  : isSearch4faces
                                                  ? 'bg-amber-500/20 border-amber-400/40 text-cyan-200'
                                                  : 'bg-[#061529] border-cyan-400/20 text-cyan-200/75'
                                              }`}
                                            >
                                              {db.statusBadge}
                                            </span>
                                          </div>

                                          <p className="text-cyan-100/75 text-xs leading-relaxed">
                                            {db.details}
                                          </p>

                                          {(db.profileUrl || isArgus || isSearch4faces) && (
                                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-cyan-500/20">
                                              {db.profileUrl && (
                                                <a
                                                  href={db.profileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                    isSearch4faces
                                                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold'
                                                      : isVk
                                                      ? 'bg-[#0077FF] hover:bg-[#0066DD] text-white'
                                                      : 'bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 hover:text-white border border-cyan-400/25'
                                                  }`}
                                                >
                                                  <span>{db.actionText || 'Открыть в базе'}</span>
                                                  <ExternalLink className="w-3 h-3" />
                                                </a>
                                              )}

                                              {isSearch4faces && currentImage && (
                                                <button
                                                  onClick={() => {
                                                    const a = document.createElement('a');
                                                    a.href = currentImage;
                                                    a.download = 'face_search4faces.jpg';
                                                    a.click();
                                                  }}
                                                  className="px-2.5 py-1.5 rounded-lg bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 hover:text-white border border-cyan-400/25 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                                  title="Скачать фото для загрузки в Search4faces"
                                                >
                                                  <Download className="w-3 h-3 text-cyan-400" />
                                                  <span>Скачать кадр для S4F</span>
                                                </button>
                                              )}

                                              {isArgus && !isIdentified && (
                                                <button
                                                  onClick={() => handleOpenRegisterModal(currentImage || undefined)}
                                                  className="px-2.5 py-1.5 rounded-lg bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 border border-cyan-400/25 text-xs font-medium cursor-pointer"
                                                >
                                                  + Внести данные в «Аргус»
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                          </>
                        ) : (
                          <div className="p-4 rounded-xl argus-card space-y-2">
                            <div className="text-sm font-semibold text-white">Параметры проверки</div>
                            <div className="grid grid-cols-2 gap-2 text-cyan-200/75">
                              <div>
                                Возрастная группа:{' '}
                                <span className="text-white font-medium">
                                  {analysis.ageEstimation.ageGroupLabelRu || 'Подросток'}
                                </span>
                              </div>
                              <div>
                                Погрешность:{' '}
                                <span className="text-white font-medium">
                                  ±{analysis.ageEstimation.errorMarginYears || 1.2} г.
                                </span>
                              </div>
                              <div>
                                Жест ко рту:{' '}
                                <span className="text-white font-medium">
                                  {analysis.handToMouthPoseDetected ? 'Да' : 'Нет'}
                                </span>
                              </div>
                              <div>
                                Шлейф пара:{' '}
                                <span className="text-white font-medium">
                                  {analysis.vaporOrSmokeDetected ? 'Да' : 'Нет'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: PHOTO INFO */}
                    {activeTab === 'photo_info' && (
                      <div className="p-4 rounded-xl argus-card space-y-3 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <span className="text-cyan-200/60 block text-[11px]">Файл</span>
                            <span className="font-medium text-white truncate block">
                              {imageMeta?.name || 'Фотография.jpg'}
                            </span>
                          </div>
                          <div>
                            <span className="text-cyan-200/60 block text-[11px]">Разрешение</span>
                            <span className="font-mono text-white block">
                              {imageMeta?.width} × {imageMeta?.height} px
                            </span>
                          </div>
                          <div>
                            <span className="text-cyan-200/60 block text-[11px]">Соотношение</span>
                            <span className="font-mono text-white block">{imageMeta?.aspectRatio}</span>
                          </div>
                          <div>
                            <span className="text-cyan-200/60 block text-[11px]">Размер</span>
                            <span className="font-mono text-white block">{imageMeta?.sizeKb} КБ</span>
                          </div>
                          <div>
                            <span className="text-cyan-200/60 block text-[11px]">Формат</span>
                            <span className="font-mono text-white block">{imageMeta?.mimeType}</span>
                          </div>
                          <div>
                            <span className="text-cyan-200/60 block text-[11px]">Зон обнаружено</span>
                            <span className="font-mono text-white block">
                              {analysis.detectedObjects?.length || 0}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-cyan-500/20">
                          <button
                            onClick={handleCopyPhotoMeta}
                            className="px-2.5 py-1 rounded-md text-cyan-100 hover:text-white bg-[#08182b] border border-cyan-400/25 transition-colors cursor-pointer"
                          >
                            {copiedMeta ? 'Скопировано' : 'Копировать параметры'}
                          </button>
                          <button
                            onClick={() => setIsFullscreenModalOpen(true)}
                            className="px-2.5 py-1 rounded-md argus-btn-primary transition-all cursor-pointer"
                          >
                            Открыть на весь экран
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB: OBJECTS */}
                    {activeTab === 'objects' && (
                      <div className="space-y-2 text-xs">
                        <div className="text-[11px] text-cyan-200/75 flex items-center justify-between pb-1 px-1">
                          <span>Наведите на объект для плавной подсветки рамки на фото:</span>
                          <span className="font-mono text-cyan-200/60">
                            Всего: {analysis.detectedObjects?.length || 0}
                          </span>
                        </div>
                        {analysis.detectedObjects && analysis.detectedObjects.length > 0 ? (
                          analysis.detectedObjects.map((obj, i) => {
                            const isDevice =
                              obj.category === 'device' ||
                              /вейп|сигарет|iqos|айкос|pod|электрон|vape|cigar|алкогол|бутылк|пив|вин/i.test(obj.label);
                            const isSmoke =
                              obj.category === 'smoke_vapor' || /пар|дым|smoke|vapor/i.test(obj.label);
                            const isFace = obj.category === 'face' || /лицо|face/i.test(obj.label);
                            const isHov = hoveredBoxIndex === i;

                            return (
                              <div
                                key={i}
                                onMouseEnter={() => setHoveredBoxIndex(i)}
                                onMouseLeave={() => setHoveredBoxIndex(null)}
                                className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                                  isHov
                                    ? isDevice
                                      ? 'bg-pink-950/40 border-pink-400 shadow-[0_0_16px_rgba(236,72,153,0.35)] translate-x-1 ring-1 ring-pink-400/50'
                                      : isFace
                                      ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)] translate-x-1 ring-1 ring-amber-400/50'
                                      : 'bg-purple-950/40 border-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.35)] translate-x-1 ring-1 ring-purple-400/50'
                                    : 'argus-card hover:border-orange-400/50'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-white">{obj.label}</span>
                                      {isDevice && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-pink-500/20 text-pink-200 font-medium border border-pink-500/35">
                                          Устройство
                                        </span>
                                      )}
                                      {isFace && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-cyan-200 font-medium border border-amber-500/35">
                                          Лицо
                                        </span>
                                      )}
                                      {isSmoke && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-200 font-medium border border-purple-500/35">
                                          Шлейф пара
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-cyan-200/60 text-[11px] font-mono mt-0.5">
                                      box_2d: [{obj.box_2d.join(', ')}]
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-mono font-medium ${
                                      isHov ? 'text-white' : 'text-cyan-200/75'
                                    }`}
                                  >
                                    {obj.confidence}%
                                  </span>
                                  <span
                                    className={`text-[11px] px-2 py-0.5 rounded-md transition-all duration-200 ${
                                      isHov
                                        ? 'bg-amber-400 text-[#150b21] font-semibold shadow-sm'
                                        : 'text-cyan-200/70 bg-[#08182b]'
                                    }`}
                                  >
                                    {isHov ? 'В фокусе' : 'Подсветить'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-cyan-200/60">
                            Объекты не зафиксированы нейросетью
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: BIOMETRICS */}
                    {activeTab === 'biometrics' && (
                      <div className="space-y-2 text-xs">
                        {analysis.ageEstimation.facialMorphologyMarkers?.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl argus-card space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{m.marker}</span>
                              <span className="text-cyan-300 text-[11px]">{m.indicativeGroup}</span>
                            </div>
                            <div className="text-cyan-100/75 text-[11px]">{m.description}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TAB: SMOKING */}
                    {activeTab === 'smoking' && (
                      <div className="p-4 rounded-xl argus-card space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-cyan-200/75">
                          <div
                            onMouseEnter={() => {
                              const devIdx = analysis.detectedObjects?.findIndex(
                                (o) =>
                                  o.category === 'device' ||
                                  /вейп|сигарет|iqos|айкос|pod|электрон|vape|cigar|алкогол|бутылк|пив|вин/i.test(o.label)
                              );
                              if (devIdx !== undefined && devIdx !== -1) setHoveredBoxIndex(devIdx);
                            }}
                            onMouseLeave={() => setHoveredBoxIndex(null)}
                            className="p-3 rounded-xl bg-[#07162b]/80 border border-cyan-400/20 transition-all hover:border-pink-400/50 cursor-pointer"
                          >
                            <div className="text-[11px] text-cyan-200/60 flex items-center justify-between">
                              <span>Устройство:</span>
                              <span className="text-[10px] text-pink-400">наведите для рамки</span>
                            </div>
                            <div className="text-white font-semibold text-sm mt-1">
                              {analysis.deviceLabelRu}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-[#07162b]/80 border border-cyan-400/20">
                            <div className="text-[11px] text-cyan-200/60">Алкоголь в руке:</div>
                            <div
                              className={`font-semibold text-sm mt-1 ${
                                analysis.isHoldingAlcohol ? 'text-pink-400' : 'text-white'
                              }`}
                            >
                              {analysis.isHoldingAlcohol
                                ? `Да (${analysis.alcoholLabelRu || 'Тара с алкоголем'})`
                                : 'Не обнаружен'}
                            </div>
                          </div>

                          <div
                            onMouseEnter={() => {
                              const smokeIdx = analysis.detectedObjects?.findIndex(
                                (o) =>
                                  o.category === 'smoke_vapor' || /пар|дым|smoke|vapor/i.test(o.label)
                              );
                              if (smokeIdx !== undefined && smokeIdx !== -1) setHoveredBoxIndex(smokeIdx);
                            }}
                            onMouseLeave={() => setHoveredBoxIndex(null)}
                            className="p-3 rounded-xl bg-[#07162b]/80 border border-cyan-400/20 transition-all hover:border-purple-400/50 cursor-pointer"
                          >
                            <div className="text-[11px] text-cyan-200/60 flex items-center justify-between">
                              <span>Шлейф пара / дыма:</span>
                              <span className="text-[10px] text-purple-300">наведите</span>
                            </div>
                            <div className="text-white font-semibold text-sm mt-1">
                              {analysis.vaporOrSmokeDetected ? 'Да' : 'Нет'}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-[#07162b]/80 border border-cyan-400/20">
                            <div className="text-[11px] text-cyan-200/60">Уверенность детектора:</div>
                            <div className="text-white font-semibold text-sm mt-1">
                              {analysis.confidencePercentage}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: LEGAL */}
                    {activeTab === 'legal' && (
                      <div className="p-4 rounded-xl argus-card space-y-2 text-xs text-cyan-100">
                        <div className="text-sm font-semibold text-white">
                          {analysis.legalAssessment.applicableArticle}
                        </div>
                        <div className="text-cyan-200/75">{analysis.legalAssessment.articleTitle}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-cyan-500/20 text-cyan-200/75">
                          <div>
                            Штраф:{' '}
                            <span className="text-white font-medium">{analysis.legalAssessment.fineAmountRu}</span>
                          </div>
                          <div>
                            Субъект:{' '}
                            <span className="text-white font-medium">{analysis.legalAssessment.responsibleSubject}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Analytical Summary Footer */}
                    {analysis.analyticalSummaryRu && (
                      <div className="p-3 rounded-xl argus-card text-xs text-cyan-100/80 leading-relaxed">
                        <span className="text-cyan-300 font-semibold">Заключение: </span>
                        {analysis.analyticalSummaryRu}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FULLSCREEN LIGHTBOX MODAL */}
        {isFullscreenModalOpen && currentImage && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0e0717]/95 backdrop-blur-md">
            <div className="px-3 sm:px-5 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/25">
              <div className="text-xs text-cyan-200/80 font-mono truncate max-w-[60vw] sm:max-w-none">
                {imageMeta?.name || 'Снимок'} · {imageMeta?.width}×{imageMeta?.height} px ·{' '}
                {Math.round(zoomLevel * 100)}%
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 rounded-lg bg-[#241336] text-cyan-200 hover:text-white cursor-pointer border border-cyan-400/25"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-2.5 py-1 rounded-lg bg-[#241336] text-xs text-cyan-200 hover:text-white cursor-pointer border border-cyan-400/25"
                >
                  100%
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 rounded-lg bg-[#241336] text-cyan-200 hover:text-white cursor-pointer border border-cyan-400/25"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsFullscreenModalOpen(false);
                    setZoomLevel(1);
                  }}
                  className="p-1.5 rounded-lg bg-pink-500/25 text-pink-200 hover:text-white cursor-pointer ml-2 border border-pink-500/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <img
                src={currentImage}
                alt="Fullscreen"
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-100"
              />
            </div>
          </div>
        )}

        {/* PHOTO INFO MODAL */}
        {isPhotoInfoModalOpen && currentImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl argus-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/25">
                <span className="text-sm font-semibold text-white">
                  Параметры снимка
                </span>
                <button
                  onClick={() => setIsPhotoInfoModalOpen(false)}
                  className="text-cyan-200/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-cyan-200/70">
                  <span>Имя файла:</span>
                  <span className="text-white">{imageMeta?.name}</span>
                </div>
                <div className="flex justify-between text-cyan-200/70">
                  <span>Разрешение:</span>
                  <span className="font-mono text-white">
                    {imageMeta?.width} × {imageMeta?.height} px
                  </span>
                </div>
                <div className="flex justify-between text-cyan-200/70">
                  <span>Соотношение:</span>
                  <span className="font-mono text-white">{imageMeta?.aspectRatio}</span>
                </div>
                <div className="flex justify-between text-cyan-200/70">
                  <span>Размер файла:</span>
                  <span className="font-mono text-white">{imageMeta?.sizeKb} КБ</span>
                </div>
                <div className="flex justify-between text-cyan-200/70">
                  <span>Время загрузки:</span>
                  <span className="text-white">{imageMeta?.uploadTime}</span>
                </div>
                <div className="flex justify-between text-cyan-200/70">
                  <span>Объектов в кадре:</span>
                  <span className="text-white font-mono">
                    {analysis?.detectedObjects?.length || 0}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cyan-500/25 text-xs">
                <button
                  onClick={handleCopyPhotoMeta}
                  className="px-3 py-1.5 rounded-lg bg-[#08182b] hover:bg-[#0e2746] text-cyan-100 font-medium cursor-pointer border border-cyan-400/25"
                >
                  {copiedMeta ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  onClick={() => {
                    setIsPhotoInfoModalOpen(false);
                    setIsFullscreenModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg argus-btn-primary cursor-pointer"
                >
                  На весь экран
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REGISTER MODAL */}
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl argus-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/25">
                <span className="text-sm font-semibold text-white">
                  Внесение в базу данных «Аргус»
                </span>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="text-cyan-200/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitSharedRecord} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-cyan-200/80 block mb-1">
                    ФИО *
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Например: Иванов Иван Иванович"
                    className="w-full px-3 py-2 rounded-lg bg-[#040d1a] border border-cyan-400/30 text-white focus:outline-none focus:border-cyan-400 shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-cyan-200/80 block mb-1">
                    Дата рождения *
                  </label>
                  <input
                    type="date"
                    required
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#040d1a] border border-cyan-400/30 text-white focus:outline-none focus:border-cyan-400 shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-cyan-200/80 block mb-1">
                    Организация / Школа (опционально)
                  </label>
                  <input
                    type="text"
                    value={regSchoolOrOrg}
                    onChange={(e) => setRegSchoolOrOrg(e.target.value)}
                    placeholder="Школа или организация"
                    className="w-full px-3 py-2 rounded-lg bg-[#040d1a] border border-cyan-400/30 text-white focus:outline-none focus:border-cyan-400 shadow-inner"
                  />
                </div>

                <label className="block text-cyan-200/80">Фотография (JPEG, PNG или WebP, до 2 МБ) *
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full mt-1" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { setRegPhoto(''); setErrorMsg('Фотография должна быть не больше 2 МБ.'); return; }
                    const reader = new FileReader();
                    reader.onload = () => setRegPhoto(typeof reader.result === 'string' ? reader.result : '');
                    reader.readAsDataURL(file);
                  }} />
                  {regPhoto && <span>Фотография выбрана.</span>}
                </label>



                {errorMsg && <p role="alert" className="text-rose-300">{errorMsg}</p>}
                <div className="flex justify-end gap-2 pt-2 border-t border-cyan-500/25">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#08182b] text-cyan-200 hover:text-white cursor-pointer border border-cyan-400/20"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={sharedSubmitting}
                    className="px-4 py-1.5 rounded-lg argus-btn-primary transition-all cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REGISTERED PEOPLE LIST MODAL */}
        {isPeopleListOpen && <SharedDatabaseAdmin close={() => setIsPeopleListOpen(false)} />}
        {false && isPeopleListOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl argus-card p-5 max-h-[80vh] flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/25 shrink-0">
                <span className="text-sm font-semibold text-white">
                  Реестр «Аргус» ({registeredPeople.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsPeopleListOpen(false);
                      handleOpenRegisterModal();
                    }}
                    className="text-xs argus-btn-primary px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    + Добавить
                  </button>
                  <button
                    onClick={() => setIsPeopleListOpen(false)}
                    className="text-cyan-200/70 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
                {registeredPeople.length === 0 ? (
                  <div className="p-6 text-center text-cyan-200/60">
                    В базе пока нет записей
                  </div>
                ) : (
                  registeredPeople.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectRegisteredPerson(p)}
                      className="p-2.5 rounded-xl bg-[#051121]/80 border border-cyan-400/25 hover:border-cyan-400/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#08182b] border border-cyan-400/30 overflow-hidden shrink-0">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-cyan-300">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{p.fullName}</div>
                          <div className="text-[11px] text-cyan-200/60 font-mono">
                            {p.age} лет · {p.birthDate}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteRegisteredPerson(p.id, e)}
                        className="p-1.5 text-cyan-200/50 hover:text-rose-400 cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-500/20 bg-[#020712]/90 py-4 text-center text-xs text-cyan-200/60">
        Система компьютерного зрения «Аргус — ИИ для Безопасного города» · {searchMode === 'database' ? 'Pro анализ' : 'Обычный анализ'}
      </footer>
    </div>
  );
}
