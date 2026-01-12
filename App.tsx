import React, { useState, useEffect, useCallback } from 'react';
import { generateImagePrompt } from './services/geminiService';
import { KieAiService, mapToQwenImageSize, mapToGrokImagineAspectRatio, getKieAiDirectDownloadUrl } from './services/kieAiService'; // Import getKieAiDirectDownloadUrl
import { KieAiImageGenerationResponse, KieAiImageModel } from './types';
import Button from './components/Button';
import Dropdown from './components/Dropdown';
import LoadingSpinner from './components/LoadingSpinner';
import ImageDisplay from './components/ImageDisplay'; // Modified for thumbnail view
import ImageDetailModal from './components/ImageDetailModal'; // New modal component
import DarkModeToggle from './components/DarkModeToggle';
import PromptBuilder from './components/PromptBuilder';
import CollapsibleSection from './components/CollapsibleSection';
import RadioSelectPanel from './components/RadioSelectPanel'; // New radio select component
import TextInput from './components/TextInput'; // Used for mainTopic and subtitles
import ApiKeyModal from './components/ApiKeyModal'; // RE-ADDED: Import ApiKeyModal
// REMOVED: import JSZip from 'jszip'; // NEW: Import JSZip for client-side zipping

interface SubtitleInput {
  id: string; // Unique ID for keying in lists
  text: string;
  emphasized: boolean;
}

/**
 * Helper function to determine if a given URL is likely hosted by Kie.ai.
 * This is based on observed domain patterns for Kie.ai generated assets.
 * @param url The image URL to check.
 * @returns True if the URL is likely from Kie.ai, false otherwise.
 */
const isKieAiHostedImageUrl = (url: string): boolean => {
  // Check for common Kie.ai domains/paths in the URL
  return url.includes('kie.ai') || url.includes('redpandaai.co') || url.includes('tempfile.1f6c');
};

/**
 * Utility function to convert a Base64 string to a Blob.
 * @param base64 The base64 string (without the "data:mime/type;base64," prefix).
 * @param mimeType The MIME type of the data.
 * @returns A Blob object.
 */
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};


// Utility function to handle the actual file download
const downloadFile = async (imageUrl: string, filename: string, kieAiApiKey: string | null): Promise<void> => {
  const MAX_RETRIES = 5;
  const INITIAL_DELAY_MS = 1000; // 1 second

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const link = document.createElement('a');
      let blobUrl: string | null = null;
      let finalImageUrl = imageUrl; // Start with the provided URL

      if (isKieAiHostedImageUrl(imageUrl)) {
        if (!kieAiApiKey) {
          throw new Error("Kie.ai API 키가 없어 Kie.ai 이미지 다운로드 URL을 생성할 수 없습니다. API 키를 설정해주세요.");
        }
        try {
          console.log(`[downloadFile] Attempt ${i + 1}: Requesting direct download URL for Kie.ai image: ${imageUrl}`);
          finalImageUrl = await getKieAiDirectDownloadUrl(kieAiApiKey, imageUrl);
          console.log(`[downloadFile] Attempt ${i + 1}: Obtained direct download URL: ${finalImageUrl}`);
        } catch (kieAiUrlError: any) {
          console.error(`[downloadFile Error] Attempt ${i + 1}: Failed to get Kie.ai direct download URL for ${imageUrl}:`, kieAiUrlError);
          throw new Error(`Kie.ai 다운로드 URL을 가져오는 데 실패했습니다: ${kieAiUrlError.message || JSON.stringify(kieAiUrlError)}. 이 문제는 유효하지 않은 Kie.ai API 키 또는 서버 문제로 발생할 수 있습니다.`);
        }
      }

      if (finalImageUrl.startsWith('data:')) {
        const parts = finalImageUrl.match(/data:(.*?);base64,(.*)/);
        if (parts && parts.length === 3) {
          const mimeType = parts[1];
          const base64Data = parts[2];
          const blob = base64ToBlob(base64Data, mimeType);
          blobUrl = URL.createObjectURL(blob);
          link.href = blobUrl;
        } else {
          console.error("[downloadFile] Invalid base64 data URL format for download.");
          throw new Error("유효하지 않은 Base64 이미지 형식입니다.");
        }
      } else {
        console.log(`[downloadFile] Attempt ${i + 1}: Attempting to fetch from: ${finalImageUrl}`);
        const response = await fetch(finalImageUrl);
        if (!response.ok) {
          let fetchErrorMessage = `이미지 데이터를 가져오는 데 실패했습니다: ${response.statusText} (상태 코드: ${response.status}).`;
          if (isKieAiHostedImageUrl(imageUrl)) { // Use original imageUrl for context
             fetchErrorMessage += ` (Kie.ai에서 제공된 직접 다운로드 URL 접근 실패)`;
          } else {
             fetchErrorMessage += ` (외부 URL 접근 실패)`;
          }
          // Heuristic for CORS block, if status is 0 (network error, often CORS) or specific headers missing
          if (response.status === 0 || !response.headers.get('Access-Control-Allow-Origin')) {
              fetchErrorMessage += `. 이 문제는 브라우저 보안 정책(CORS) 또는 네트워크 문제로 인해 발생할 수 있습니다. 수동으로 다운로드하려면 "새 탭에서 이미지 열기" 버튼을 사용해 보세요.`;
          }
          throw new Error(fetchErrorMessage);
        }
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      return;
    } catch (error) {
      console.warn(`[downloadFile Error] Attempt ${i + 1} failed for ${imageUrl}:`, error);
      if (i < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Re-throw the error after all retries
      }
    }
  }
};

// Utility to convert data URL to { data, mimeType }
const dataUrlToParts = (dataUrl: string): { data: string; mimeType: string } | null => {
  const parts = dataUrl.match(/data:(.*?);base64,(.*)/);
  if (parts && parts.length === 3) {
    return {
      mimeType: parts[1],
      data: parts[2],
    };
  }
  return null;
};

// New utility function to convert an external image URL to base64 Data URL parts
const imageUrlToBase64 = async (imageUrl: string, kieAiApiKey: string | null): Promise<{ data: string; mimeType: string }> => {
  let finalImageUrl = imageUrl;

  try {
    if (isKieAiHostedImageUrl(imageUrl)) {
      if (!kieAiApiKey) {
        throw new Error("Kie.ai API 키가 없어 Kie.ai 이미지 데이터를 읽을 수 없습니다. API 키를 설정해주세요.");
      }
      try {
        console.log(`[imageUrlToBase64] Requesting direct download URL for Kie.ai image: ${imageUrl}`);
        finalImageUrl = await getKieAiDirectDownloadUrl(kieAiApiKey, imageUrl);
        console.log(`[imageUrlToBase64] Obtained direct download URL: ${finalImageUrl}`);
      } catch (kieAiUrlError: any) {
        throw new Error(`Kie.ai 다운로드 URL을 가져오는 데 실패했습니다: ${kieAiUrlError.message || JSON.stringify(kieAiUrlError)}. 이 문제는 유효하지 않은 Kie.ai API 키 또는 서버 문제로 발생할 수 있습니다.`);
      }
    }

    console.log(`[imageUrlToBase64] Attempting to fetch from: ${finalImageUrl}`);
    const response = await fetch(finalImageUrl, { credentials: 'omit' });
    if (!response.ok) {
      let fetchErrorMessage = `이미지 데이터를 가져오는 데 실패했습니다: ${response.statusText} (상태 코드: ${response.status}).`;
      if (isKieAiHostedImageUrl(imageUrl)) { // Use original imageUrl for context
         fetchErrorMessage += ` (Kie.ai에서 제공된 직접 다운로드 URL 접근 실패)`;
      } else {
         fetchErrorMessage += ` (외부 URL 접근 실패)`;
      }
      if (response.status === 0 || !response.headers.get('Access-Control-Allow-Origin')) {
          fetchErrorMessage += `. 이 문제는 브라우저 보안 정책(CORS) 또는 네트워크 문제로 인해 발생할 수 있습니다.`;
      }
      throw new Error(fetchErrorMessage);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const mimeTypeMatch = reader.result.match(/data:(.*?);base64,/);
          const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : blob.type;
          const base64Data = reader.result.split(',')[1];
          resolve({ data: base64Data, mimeType });
        } else {
          reject(new Error("가져온 이미지 Blob을 문자열로 읽을 수 없습니다."));
        }
      };
      // Corrected: ProgressEvent does not have .message directly, access .target.error.message
      reader.onerror = (event: ProgressEvent<FileReader>) => reject(new Error(`FileReader 오류: ${event.target?.error?.message || '알 수 없음'}`));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("[Base64 Conversion Error]:", error);
    if (error instanceof Error) {
        throw error; // Re-throw the specific error including custom Kie.ai or CORS messages
    } else if (typeof error === 'string') {
        throw new Error(error);
    } else {
        throw new Error(`이미지 데이터를 Base64로 변환하는 중 알 수 없는 오류 발생: ${JSON.stringify(error)}`);
    }
  }
};


const App: React.FC = () => {
  // Structured Prompt Builder States
  const [category, setCategory] = useState<string[]>(['선택 안함']);
  const [style, setStyle] = useState<string[]>(['선택 안함']);
  const [filter, setFilter] = useState<string[]>(['선택 안함']); // New state for image filter
  const [character, setCharacter] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [angle, setAngle] = useState<string[]>(['선택 안함']);
  const [shotType, setShotType] = useState<string[]>(['선택 안함']);
  const [lighting, setLighting] = useState<string[]>(['선택 안함']);
  const [composition, setComposition] = useState<string[]>(['선택 안함']);
  const [skinColor, setSkinColor] = useState<string[]>(['선택 안함']);
  const [hairStyle, setHairStyle] = useState<string[]>(['선택 안함']);
  // NEW: Gender and Age Range
  const [gender, setGender] = useState<string[]>(['선택 안함']);
  const [ageRange, setAgeRange] = useState<string[]>(['선택 안함']);
  // NEW: Clothing, Accessories, Hats, Glasses as selections
  const [clothingStyle, setClothingStyle] = useState<string[]>(['선택 안함']);
  const [accessoriesSelection, setAccessoriesSelection] = useState<string[]>(['선택 안함']);
  const [hats, setHats] = useState<string[]>(['선택 안함']);
  const [glasses, setGlasses] = useState<string[]>(['선택 안함']);
  const [bodyType, setBodyType] = useState<string[]>(['선택 안함']);
  const [personalityTraits, setPersonalityTraits] = useState<string>('');
  const [backstory, setBackstory] = useState<string>('');
  const [cameraGear, setCameraGear] = useState<string[]>(['선택 안함']);
  const [characterReferenceImage, setCharacterReferenceImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [characterReferenceImageFileName, setCharacterReferenceImageFileName] = useState<string | null>(null);

  // Generation Control States
  const [mainTopic, setMainTopic] = useState<string>(''); // New: AI 이미지 생성 주제목
  const [subtitles, setSubtitles] = useState<SubtitleInput[]>([]); // New: 부제목 편집 옵션
  const [imageQuality, setImageQuality] = useState<string>('1K (표준)'); // New: 이미지 품질
  const [presetName, setPresetName] = useState<string>(''); // New: 커스텀 프리셋 이름

  // CHANGED: generatedPrompt is now directly editable
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [availableImageModels, setAvailableImageModels] = useState<
    KieAiImageModel[]
  >([]);
  // NEW: State for models that support editing
  const [availableEditingModels, setAvailableEditingModels] = useState<KieAiImageModel[]>([]);
  const [selectedImageModel, setSelectedImageModel] = useState<string>('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('16:9');

  // Determine if the currently selected model in the main UI is one of the allowed editing models
  // FIX: Moved this declaration here to resolve "Block-scoped variable 'canEditCurrentSelectedModel' used before its declaration"
  const canEditCurrentSelectedModel = (
    selectedImageModel === 'kie-gemini-flash-image' ||
    selectedImageModel === 'kie-gemini-pro-image' ||
    selectedImageModel === 'kie-imagen-4' ||
    selectedImageModel === 'kie-4o-image' || // ADDED: 4o Image supports I2I/reference image
    selectedImageModel === 'kie-flux-2-pro'    // ADDED: Flux-2 Pro supports I2I/editing
  );

  const [generatedImages, setGeneratedImages] = useState<
    KieAiImageGenerationResponse[]
  >([]);

  const [isLoadingPrompt, setIsLoadingPrompt] = useState<boolean>(false);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [isEditingImage, setIsEditingImage] = useState<boolean>(false);
  // REMOVED: const [isDownloadingAllImages, setIsDownloadingAllImages] = useState<boolean>(false); // NEW: State for batch download loading
  // REMOVED: const [currentDownloadingImageIndex, setCurrentDownloadingImageIndex] = useState<number>(0); // NEW
  // REMOVED: const [totalImagesToDownload, setTotalImagesToDownload] = useState<number>(0); // NEW
  // REMOVED: const [downloadingStage, setDownloadingStage] = useState<'idle' | 'fetching' | 'zipping' | 'finished'>('idle'); // NEW: Stage for batch download
  const [error, setError] = useState<string | null>(null);
  const [showMockModelWarning, setShowMockModelWarning] = useState<boolean>(false); // State for mock model warning

  const [isGeneratedPromptSectionOpen, setIsGeneratedPromptSectionOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Dark mode state - moved here to ensure localStorage is available and managed directly
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Attempt to read from localStorage, default to true (dark mode) if not found or invalid
    try {
      const storedMode = localStorage.getItem('darkMode');
      return storedMode ? JSON.parse(storedMode) : true; // Default to true (dark mode)
    } catch (e) {
      console.error("Failed to parse dark mode from localStorage", e);
      return true; // Default to dark mode on error
    }
  });

  // State for image detail modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedImageForModal, setSelectedImageForModal] = useState<KieAiImageGenerationResponse | null>(null);

  // State for download numbering
  const [downloadSequence, setDownloadSequence] = useState<number>(0);
  const [lastDownloadDate, setLastDownloadDate] = useState<string>(''); // YYYYMMDD format

  // RE-ADDED: States for API Key management (Gemini & Kie.ai)
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(''); // For the input field value
  const [kieAiApiKey, setKieAiApiKey] = useState<string | null>(null);
  const [kieAiApiKeyInput, setKieAiApiKeyInput] = useState<string>(''); // For the input field value
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false); // Controls visibility of the API key modal


  const aspectRatioOptions = [
    { value: '16:9', label: '16:9 (가로형 와이드)' },
    { value: '9:16', label: '9:16 (세로형 와이드)' },
    { value: '4:3', label: '4:3 (가로형)' },
    { value: '3:4', label: '3:4 (세로형)' },
    { value: '1:1', label: '1:1 (정사각형)' },
    { value: '2:3', label: '2:3 (세로형 표준)' }, // NEW Aspect Ratio from Kie.ai docs
    { value: '3:2', label: '3:2 (가로형 표준)' }, // NEW Aspect Ratio from Kie.ai docs
    { value: '21:9', label: '21:9 (시네마틱 와이드)' },
    { value: '16:21', label: '16:21 (세로형 시네마틱)' },
  ];

  // Image quality options (only visible/enabled for Imagen 4.0 or Gemini Pro Image)
  const imageQualityOptions = [
    { value: '1K (표준)', label: '1K (표준)', description: '기본 해상도 1024x1024.' },
    { value: '2K', label: '2K', description: '고해상도 2048x2048. 더 선명한 이미지.' },
    { value: '4K', label: '4K', description: '최고 해상도 4096x4096. 매우 섬세한 디테일.' },
  ];

  // Effect for Dark Mode - manages 'dark' class on HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prevMode) => !prevMode);
  }, []);

  // Check if the selected model is one of the Google API models (Gemini or Imagen)
  const isGoogleBackedModel = useCallback((modelId: string) => {
    return modelId.startsWith('kie-gemini') || modelId.startsWith('kie-imagen');
  }, []);

  // Check if the selected model is the Kie.ai 4o Image model
  const isKieAi4oImageModel = useCallback((modelId: string) => {
    return modelId === 'kie-4o-image';
  }, []);

  // Check if the selected model is the Kie.ai Seedream 4.0 model
  const isKieAiSeedream4Model = useCallback((modelId: string) => {
    return modelId === 'kie-seedream-4';
  }, []);

  // Check if the selected model is the Kie.ai Flux Kontext Pro model
  const isKieAiFlux2ProModel = useCallback((modelId: string) => { // Updated name, but ID remains 'kie-flux-2-pro'
    return modelId === 'kie-flux-2-pro';
  }, []);

  // Check if the selected model is the Kie.ai Midjourney model
  const isKieAiMidjourneyModel = useCallback((modelId: string) => {
    return modelId === 'kie-midjourney';
  }, []);
  
  // NEW: Check if the selected model is the Kie.ai Z-Image model
  const isKieAiZImageModel = useCallback((modelId: string) => {
    return modelId === 'kie-z-image';
  }, []);

  // NEW: Check if the selected model is the Kie.ai Grok Imagine model
  const isKieAiGrokImagineModel = useCallback((modelId: string) => {
    return modelId === 'kie-grok-imagine';
  }, []);

  // NEW: Check if the selected model is the Kie.ai Qwen AI model
  const isKieAiQwenModel = useCallback((modelId: string) => {
    return modelId === 'kie-qwen';
  }, []);


  // Initial load effect for models and API keys (RE-ADDED key loading)
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await KieAiService.getAvailableModels();
        setAvailableImageModels(models);
        if (models.length > 0) {
          if (!models.some(m => m.id === selectedImageModel)) {
            setSelectedImageModel(models[0].id);
          }
        }

        // Filter for available editing models - NOW includes Kie.ai I2I capable models
        const allowedEditingModels = models.filter(m =>
          m.id === 'kie-gemini-flash-image' ||
          m.id === 'kie-gemini-pro-image' ||
          m.id === 'kie-imagen-4' ||
          m.id === 'kie-4o-image' || // ADDED: 4o Image supports I2I/reference image
          m.id === 'kie-flux-2-pro'    // ADDED: Flux-2 Pro supports I2I/editing
        );
        setAvailableEditingModels(allowedEditingModels);

      } catch (err) {
        console.error('이미지 모델 로드 실패:', err);
        let userFacingError = "이미지 모델 로드 실패";
        if (err instanceof Error) {
          userFacingError = err.message;
        } else if (typeof err === 'string') {
          userFacingError = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
          userFacingError = (err as any).message;
        } else {
          userFacingError = JSON.stringify(err);
        }
        setError(
          `이미지 모델 로드 실패: ${userFacingError}`,
        );
      }
    };
    fetchModels();

    // RE-ADDED: Load API Keys from local storage on initial load
    const storedGeminiApiKey = localStorage.getItem('geminiApiKey');
    if (storedGeminiApiKey) {
      setGeminiApiKey(storedGeminiApiKey);
      setGeminiApiKeyInput(storedGeminiApiKey); // Initialize input field
    }
    const storedKieAiApiKey = localStorage.getItem('kieAiApiKey');
    if (storedKieAiApiKey) {
      setKieAiApiKey(storedKieAiApiKey);
      setKieAiApiKeyInput(storedKieAiApiKey); // Initialize input field
    }

    // RE-ADDED: Show API key modal if any key is missing on initial load
    if (!storedGeminiApiKey || !storedKieAiApiKey) {
      setShowApiKeyModal(true);
    }
  }, [selectedImageModel]); // Added selectedImageModel to dependencies to ensure re-evaluation if its value changes externaly

  // Effect to show/hide mock model warning
  useEffect(() => {
    // Show mock warning if the selected model is a mock model
    const currentModelIsMock = availableImageModels.find(m => m.id === selectedImageModel)?.id.startsWith('mock-');
    if (currentModelIsMock) {
      setShowMockModelWarning(true);
    } else {
      setShowMockModelWarning(false);
    }
  }, [selectedImageModel, availableImageModels]);

  const handleStructuredPromptChange = useCallback(
    (promptParts: {
      category: string[]; style: string[]; character: string; description: string;
      angle: string[]; shotType: string[]; lighting: string[]; composition: string[];
      skinColor: string[]; hairStyle: string[];
      gender: string[]; ageRange: string[]; // NEW
      clothingStyle: string[]; accessoriesSelection: string[]; hats: string[]; glasses: string[]; // NEW
      bodyType: string[];
      personalityTraits: string; // New
      backstory: string; // New
      cameraGear: string[]; // New
      filter: string[]; // New
    }) => {
      setCategory(promptParts.category); setStyle(promptParts.style); setCharacter(promptParts.character);
      setDescription(promptParts.description); setAngle(promptParts.angle); setShotType(promptParts.shotType);
      setLighting(promptParts.lighting); setComposition(promptParts.composition); setSkinColor(promptParts.skinColor);
      setHairStyle(promptParts.hairStyle);
      setGender(promptParts.gender); setAgeRange(promptParts.ageRange); // NEW
      setClothingStyle(promptParts.clothingStyle); setAccessoriesSelection(promptParts.accessoriesSelection);
      setHats(promptParts.hats); setGlasses(promptParts.glasses); // NEW
      setBodyType(promptParts.bodyType);
      setPersonalityTraits(promptParts.personalityTraits); // New
      setBackstory(promptParts.backstory); // New
      setCameraGear(promptParts.cameraGear); // New dependency
      setFilter(promptParts.filter); // New dependency
    },
    [],
  );

  const handleCharacterReferenceChange = useCallback((image: { data: string; mimeType: string; } | null, fileName: string | null) => {
    setCharacterReferenceImage(image);
    setCharacterReferenceImageFileName(fileName);
  }, []);

  const handleGeneratePrompt = useCallback(async () => {
    const hasMeaningfulSelection = (values: string[]) => {
      return values.length > 0 && !(values.length === 1 && values[0] === '선택 안함');
    };

    const isAnyFieldPopulated =
      hasMeaningfulSelection(category) || hasMeaningfulSelection(style) ||
      character.trim().length > 0 || description.trim().length > 0 ||
      hasMeaningfulSelection(angle) || hasMeaningfulSelection(shotType) ||
      hasMeaningfulSelection(lighting) || hasMeaningfulSelection(composition) ||
      hasMeaningfulSelection(skinColor) || hasMeaningfulSelection(hairStyle) ||
      hasMeaningfulSelection(gender) || hasMeaningfulSelection(ageRange) || // NEW
      hasMeaningfulSelection(clothingStyle) || hasMeaningfulSelection(accessoriesSelection) || // NEW
      hasMeaningfulSelection(hats) || hasMeaningfulSelection(glasses) || // NEW
      hasMeaningfulSelection(bodyType) ||
      personalityTraits.trim().length > 0 || // New
      backstory.trim().length > 0 || // New
      hasMeaningfulSelection(cameraGear) || // New
      hasMeaningfulSelection(filter) || // New
      mainTopic.trim().length > 0 || // New: mainTopic
      subtitles.some(s => s.text.trim().length > 0); // New: subtitles

    if (!isAnyFieldPopulated && !characterReferenceImage) {
      setError('프롬프트 생성을 위해 최소한 하나의 아이디어를 입력하거나 레퍼런스 이미지를 제공해주세요.');
      return;
    }
    
    // RE-ADDED: Check for Gemini API Key before generating prompt
    if (!geminiApiKey) {
      setError('Gemini API 키가 필요합니다. 키를 입력하고 저장해주세요.');
      setShowApiKeyModal(true); // Open modal to prompt for keys
      return;
    }

    setIsLoadingPrompt(true);
    setError(null);
    try {
      const prompt = await generateImagePrompt(
        {
          mainTopic, // Pass mainTopic
          category, style, character, description, angle, shotType, lighting,
          composition, skinColor, hairStyle,
          gender, ageRange, // NEW
          clothingStyle, accessoriesSelection, hats, glasses, // NEW
          bodyType, accessories: '', // Keep accessories for now, but will be replaced by accessoriesSelection.
          personalityTraits, // New
          backstory, // New
          cameraGear, // New
          filter, // New
          hasCharacterReferenceImage: !!characterReferenceImage, // Pass reference image presence
          imageQuality, // Pass selected image quality
          subtitles, // Pass subtitles
        },
        geminiApiKey // RE-ADDED: Pass the Gemini API key
      );
      setGeneratedPrompt(prompt);
      setIsGeneratedPromptSectionOpen(true); // Open the collapsible section automatically
    } catch (err: any) {
      console.error('프롬프트 생성 오류:', err);
      let userFacingError = "알 수 없는 오류가 발생했습니다.";
      if (err instanceof Error) {
        userFacingError = err.message;
      } else if (typeof err === 'string') {
        userFacingError = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        userFacingError = (err as any).message;
      } else {
        userFacingError = JSON.stringify(err);
      }
      setError(
        `프롬프트 생성 오류: ${userFacingError}`
      );
    } finally {
      setIsLoadingPrompt(false);
    }
  }, [
    mainTopic, subtitles, imageQuality, // New dependencies
    category, style, character, description, angle, shotType, lighting,
    composition, skinColor, hairStyle,
    gender, ageRange, // NEW
    clothingStyle, accessoriesSelection, hats, glasses, // NEW
    bodyType, // removed old 'clothing' and 'accessories'
    personalityTraits, backstory, // New dependencies
    cameraGear, filter, // New dependencies
    characterReferenceImage, // Added as a dependency to check its presence
    geminiApiKey, // RE-ADDED: Added geminiApiKey dependency
  ]);

  const handleGenerateImage = useCallback(async () => {
    // CHANGED: Now using the editable generatedPrompt field.
    if (!generatedPrompt.trim()) {
      setError('먼저 이미지 프롬프트를 생성하거나 직접 입력해주세요.');
      return;
    }
    if (!selectedImageModel) {
      setError('이미지 생성 모델을 선택해주세요.');
      return;
    }
    if (!selectedAspectRatio) {
      setError('이미지 비율을 선택해주세요.');
      return;
    }

    // Z-Image specific prompt length validation
    const Z_IMAGE_MAX_PROMPT_LENGTH = 1000;
    if (selectedImageModel === 'kie-z-image' && generatedPrompt.length > Z_IMAGE_MAX_PROMPT_LENGTH) {
      setError(`Z-Image 모델은 프롬프트가 ${Z_IMAGE_MAX_PROMPT_LENGTH}자를 초과할 수 없습니다. 현재 ${generatedPrompt.length}자입니다. 프롬프트를 줄여주세요.`);
      return;
    }


    let modelToUse = selectedImageModel;
    // UPDATED: allowedGoogleI2IModels now only for Google models, Kie.ai I2I models are handled by kieAiApiKey check
    const allowedGoogleI2IModels = ['kie-gemini-flash-image', 'kie-gemini-pro-image', 'kie-imagen-4'];

    if (characterReferenceImage) {
      // Check if the selected model (from main dropdown) supports reference images
      if (!allowedGoogleI2IModels.includes(selectedImageModel) && !isKieAi4oImageModel(selectedImageModel) && !isKieAiFlux2ProModel(selectedImageModel)) {
        setError('인물 및 이미지 레퍼런스 기능은 \'나노바나나\', \'나노바나나 프로\', \'Imagen 4.0\', \'4o Image API\', \'Flux-2 Pro\' 모델에서 지원됩니다. 이 중 하나를 선택해주세요.');
        return; // Stop generation if unsupported model
      } else if (selectedImageModel === 'kie-gemini-flash-image') {
        // Only a suggestion, not an error or forced switch
        setError('인물 및 이미지 레퍼런스 기능은 \'나노바나나 프로\' 모델에서 가장 만족스러운 결과를 제공합니다.');
      }
      modelToUse = selectedImageModel; // Use the selected model if it's in the allowed list
    }
    
    // RE-ADDED: Check for API keys based on the selected model
    // Check keys for the *modelToUse* after potential override
    if (isGoogleBackedModel(modelToUse) && !geminiApiKey) {
      setError('Gemini/Imagen 모델을 사용하려면 Gemini API 키가 필요합니다. 키를 입력하고 저장해주세요.');
      setShowApiKeyModal(true); // Open modal to prompt for keys
      return;
    }
    if ((isKieAi4oImageModel(modelToUse) || isKieAiSeedream4Model(modelToUse) || isKieAiFlux2ProModel(modelToUse) || isKieAiMidjourneyModel(modelToUse) || isKieAiZImageModel(modelToUse) || isKieAiGrokImagineModel(modelToUse) || isKieAiQwenModel(modelToUse)) && !kieAiApiKey) {
      setError('선택된 모델은 Kie.ai API 키가 필요합니다. 키를 입력하고 저장해주세요.');
      setShowApiKeyModal(true); // Open modal to prompt for keys
      return;
    }

    // Validate characterReferenceImage for Text-to-Image only models
    // Qwen is now T2I ONLY, so it should be included here.
    if ((isKieAiSeedream4Model(modelToUse) || isKieAiMidjourneyModel(modelToUse) || isKieAiZImageModel(modelToUse) || isKieAiGrokImagineModel(modelToUse) || isKieAiQwenModel(modelToUse)) && characterReferenceImage) { // Check for reference image
      setError(`'${availableImageModels.find(m => m.id === modelToUse)?.name}'은 텍스트-투-이미지만 지원합니다. 레퍼런스 이미지를 제거해주세요.`);
      return;
    }

    // REMOVED: No longer need to validate for I2I specific requirement for Qwen as it's now T2I.
    
    setIsLoadingImage(true);
    // setError(null); // Keep error from model change if exists
    setShowMockModelWarning(false); // Dismiss mock warning on actual generation attempt

    try {
      const newImage = await KieAiService.generateImage(
        generatedPrompt, // CHANGED: Use the current generatedPrompt state (editable)
        modelToUse, // Use modelToUse which might be overridden
        512, // width is placeholder, actual dimensions handled by aspect ratio config
        512, // height is placeholder
        selectedAspectRatio,
        characterReferenceImage, // Pass the character reference image for new generation
        null, // No image to edit for initial generation
        imageQuality, // Pass image quality
        geminiApiKey, // RE-ADDED: Pass Gemini API key for Google models
        kieAiApiKey, // RE-ADDED: Pass Kie.ai API key for Kie.ai 4o Image model
        characterReferenceImageFileName, // Pass the filename for characterReferenceImage
      );
      setGeneratedImages((prevImages) => [newImage, ...prevImages]);
    } catch (err: any) {
      console.error('이미지 생성 오류:', err);
      let userFacingError = "알 수 없는 오류가 발생했습니다.";
      if (err instanceof Error) {
        userFacingError = err.message;
      } else if (typeof err === 'string') {
        userFacingError = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        userFacingError = (err as any).message;
      } else {
        userFacingError = JSON.stringify(err);
      }
      setError(
        `이미지 생성 오류: ${userFacingError}`
      );
    } finally {
      setIsLoadingImage(false);
    }
  }, [generatedPrompt, selectedImageModel, selectedAspectRatio, characterReferenceImage, characterReferenceImageFileName, imageQuality, isGoogleBackedModel, isKieAi4oImageModel, isKieAiSeedream4Model, isKieAiFlux2ProModel, isKieAiMidjourneyModel, isKieAiZImageModel, isKieAiGrokImagineModel, isKieAiQwenModel, geminiApiKey, kieAiApiKey, canEditCurrentSelectedModel]); // RE-ADDED: Added all API key related dependencies and Qwen model

  const handleEditImage = useCallback(async (originalImage: KieAiImageGenerationResponse, editPrompt: string, editingModelId: string) => {
    if (!editPrompt.trim()) {
      setError('편집할 내용을 입력해주세요.');
      return;
    }

    if (originalImage.isMock) {
      setError('모의 이미지는 편집할 수 없습니다.');
      return;
    }
    
    let editingModelName: string | undefined = availableImageModels.find(m => m.id === editingModelId)?.name;
    // Fallback if name is not found, though it should be.
    if (!editingModelName) editingModelName = editingModelId;


    // API Key checks for the selected editing model
    if (isGoogleBackedModel(editingModelId)) {
        if (!geminiApiKey) {
            setError(`'${editingModelName}' 모델을 사용하려면 Gemini API 키가 필요합니다. 키를 입력하고 저장해주세요.`);
            setShowApiKeyModal(true);
            return;
        }
    } else {
        // This branch now covers Kie.ai I2I models (4o Image, Flux-2 Pro)
        if (!kieAiApiKey) {
            setError(`'${editingModelName}' 모델을 사용하려면 Kie.ai API 키가 필요합니다. 키를 입력하고 저장해주세요.`);
            setShowApiKeyModal(true);
            return;
        }
    }

    setIsEditingImage(true); // Set editing loading state
    setError(null);
    setShowMockModelWarning(false); // Dismiss mock warning on actual generation attempt

    try {
      let imageToEditParts: { data: string; mimeType: string; } | null = null;
      
      // Determine if the original image is a data URL or an external URL
      if (originalImage.imageUrl.startsWith('data:')) {
        imageToEditParts = dataUrlToParts(originalImage.imageUrl);
        if (!imageToEditParts) {
            // Specific error for malformed data URLs
            throw new Error("편집할 이미지 데이터를 읽을 수 없습니다. (손상된 Data URL 형식)");
        }
      } else {
        // If it's an external URL, fetch it and convert to base64
        // imageUrlToBase64 now explicitly throws on error, so this call will either succeed or throw.
        imageToEditParts = await imageUrlToBase64(originalImage.imageUrl, kieAiApiKey); // Pass kieAiApiKey
      }

      // If we reach this point, imageToEditParts is guaranteed to be a valid object.

      const newImage = await KieAiService.generateImage(
        editPrompt, // The editing instruction is the new prompt
        editingModelId, // Use the determined editing model from modal
        512, 512, // Placeholder dimensions
        selectedAspectRatio,
        null, // No character reference image for editing an existing image
        imageToEditParts, // The image to be edited (now always base64)
        imageQuality, // Pass image quality to editing as well
        geminiApiKey, // Pass Gemini API key for Google models
        kieAiApiKey, // Pass Kie.ai API key if needed (e.g., for Flux Kontext editing)
        // For imageToEdit, we don't have an original filename from upload, Kie.aiService will use a generic name
      );
      setGeneratedImages((prevImages) => [newImage, ...prevImages]);
      setIsModalOpen(false); // Close modal after successful edit
      setSelectedImageForModal(null); // Clear selected image
    } catch (err: any) {
      console.error('이미지 편집 오류:', err);
      let userFacingError = "알 수 없는 오류가 발생했습니다.";
      const originalImageUrl = originalImage?.imageUrl; // Get URL of the image being edited

      if (err instanceof Error) {
        userFacingError = err.message;
        // Prioritize specific Kie.ai API key or URL fetching errors
        if (userFacingError.includes('Kie.ai API 키가 없어')) {
            userFacingError = `Kie.ai API 키가 없어 이미지를 편집할 수 없습니다. 키를 입력하고 저장해주세요.`;
        } else if (userFacingError.includes('Kie.ai 다운로드 URL을 가져오는 데 실패')) {
            userFacingError = `Kie.ai 다운로드 URL을 가져오는 데 실패했습니다. Kie.ai API 키가 유효한지 확인하거나 네트워크 상태를 점검해주세요. (세부: ${userFacingError})`;
        } else if (userFacingError.includes('Failed to fetch') || userFacingError.includes('이미지 데이터를 가져오는 데 실패했습니다')) {
            // More specific message for "Failed to fetch" or general image data fetching
            let corsHint = "이 문제는 브라우저 보안 정책(CORS) 또는 네트워크 문제로 인해 발생할 수 있습니다.";
            if (originalImageUrl && !originalImageUrl.startsWith('data:') && !isKieAiHostedImageUrl(originalImageUrl)) {
                corsHint += " 외부 URL 이미지는 브라우저 보안으로 인해 직접 편집하기 어렵습니다. 이미지를 직접 다운로드한 후, '인물 및 이미지 레퍼런스' 섹션을 통해 다시 업로드하여 편집을 시도해 볼 수 있습니다.";
            } else if (originalImageUrl && isKieAiHostedImageUrl(originalImageUrl)) {
                corsHint += " Kie.ai 호스팅 이미지의 경우, 직접 다운로드 URL 접근 시에도 간헐적으로 발생할 수 있습니다. Kie.ai API 키가 유효한지 확인하거나 네트워크 상태를 점검해주세요. 또는, 이미지를 직접 다운로드한 후, '인물 및 이미지 레퍼런스' 섹션을 통해 다시 업로드하여 편집을 시도해 볼 수 있습니다.";
            }
            userFacingError = `이미지 데이터를 읽어오는 데 실패했습니다: ${userFacingError}. ${corsHint}`;
        }
      } else if (typeof err === 'string') {
        userFacingError = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        userFacingError = (err as any).message;
      } else {
        userFacingError = JSON.stringify(err);
      }
      setError(
        `이미지 편집 오류: ${userFacingError}`
      );
    } finally {
      setIsEditingImage(false); // Reset editing loading state
    }
  }, [selectedAspectRatio, imageQuality, availableImageModels, isGoogleBackedModel, geminiApiKey, kieAiApiKey]);


  // RE-ADDED: Handler for saving both API Keys
  const handleSaveApiKeys = useCallback(() => {
    if (!geminiApiKeyInput.trim() || !kieAiApiKeyInput.trim()) {
      setError('두 API 키를 모두 입력해주세요.');
      return;
    }

    localStorage.setItem('geminiApiKey', geminiApiKeyInput.trim());
    setGeminiApiKey(geminiApiKeyInput.trim());
    localStorage.setItem('kieAiApiKey', kieAiApiKeyInput.trim());
    setKieAiApiKey(kieAiApiKeyInput.trim());

    setShowApiKeyModal(false); // Hide the input section
    setError(null); // Clear any previous error
  }, [geminiApiKeyInput, kieAiApiKeyInput]);

  // RE-ADDED: Handler for removing both API Keys
  const handleRemoveApiKeys = useCallback(() => {
    localStorage.removeItem('geminiApiKey');
    setGeminiApiKey(null);
    setGeminiApiKeyInput(''); // Clear input field
    localStorage.removeItem('kieAiApiKey'); // FIX: Typo in original code was 'kieAiAiKey'
    setKieAiApiKey(null);
    setKieAiApiKeyInput(''); // Clear input field

    setShowApiKeyModal(true); // Show the input section again as keys are missing
    setError(null);
  }, []);

  const hasMeaningfulSelection = (values: string[]) => {
    return values.length > 0 && !(values.length === 1 && values[0] === '선택 안함');
  };

  // RE-ADDED: isAnyKeyMissing
  const isAnyKeyMissing = !geminiApiKey || !kieAiApiKey;

  // Global loading state for disabling buttons - NOW excludes isDownloadingAllImages
  const isGlobalLoading = isLoadingPrompt || isLoadingImage || isEditingImage; // REMOVED: || isDownloadingAllImages;

  // Main disable condition for prompt generation & image generation/editing
  const isOperationDisabled = isGlobalLoading || isAnyKeyMissing || showApiKeyModal; // RE-ADDED: Depends on API key presence and modal visibility

  const isPromptGenerateDisabled = isOperationDisabled ||
    (
      !hasMeaningfulSelection(category) && !hasMeaningfulSelection(style) &&
      !character.trim() && !description.trim() &&
      !hasMeaningfulSelection(angle) && !hasMeaningfulSelection(shotType) &&
      !hasMeaningfulSelection(lighting) && !hasMeaningfulSelection(composition) &&
      !hasMeaningfulSelection(skinColor) && !hasMeaningfulSelection(hairStyle) &&
      !hasMeaningfulSelection(gender) && !hasMeaningfulSelection(ageRange) &&
      !hasMeaningfulSelection(clothingStyle) && !hasMeaningfulSelection(accessoriesSelection) && // Changed from || to &&
      !hasMeaningfulSelection(hats) && !hasMeaningfulSelection(glasses) && // Changed from || to &&
      !hasMeaningfulSelection(bodyType) &&
      !personalityTraits.trim() && !backstory.trim() &&
      !hasMeaningfulSelection(cameraGear) && // New check
      !hasMeaningfulSelection(filter) && // New check
      !characterReferenceImage &&
      !mainTopic.trim() && // New check
      !subtitles.some(s => s.text.trim().length > 0)
    );


  const handleCopyPrompt = useCallback(async () => {
    if (!generatedPrompt) return;

    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopyStatus('copied');
    } catch (err) {
      console.error('프롬프트 복사 실패:', err);
      setCopyStatus('failed');
    } finally {
      setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    }
  }, [generatedPrompt]);

  // Modal handlers
  const openImageDetailModal = useCallback((image: KieAiImageGenerationResponse) => {
    setSelectedImageForModal(image);
    setIsModalOpen(true);
  }, []);

  const closeImageDetailModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedImageForModal(null);
    // Reset editing state when modal closes
    setIsEditingImage(false);
  }, []);

  // Utility for formatting date
  const getTodayDate = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }, []);

  // Function to get the next sequence number and filename without updating state
  const getDownloadInfo = useCallback(() => {
    const today = getTodayDate();
    let currentSequence = downloadSequence;
    let currentLastDownloadDate = lastDownloadDate;

    // If it's a new day, reset sequence
    if (today !== currentLastDownloadDate) {
      currentSequence = 0;
      currentLastDownloadDate = today;
    }
    currentSequence++; // Increment for the current download

    const paddedSequence = currentSequence.toString().padStart(2, '0');
    const filename = `(${today}_${paddedSequence}).png`;
    
    return { nextSequence: currentSequence, filename, todayDate: currentLastDownloadDate };
  }, [downloadSequence, lastDownloadDate, getTodayDate]);


  // Handler for individual image download from modal
  const handleModalImageDownload = useCallback(async (image: KieAiImageGenerationResponse) => {
    const { nextSequence, filename, todayDate } = getDownloadInfo(); // Get next sequence and filename
    setDownloadSequence(nextSequence); // Update sequence state
    setLastDownloadDate(todayDate); // Update date state
    setError(null); // Clear previous error

    try {
        console.log(`[handleModalImageDownload] Attempting direct download for image: ${image.imageUrl}`);
        // Pass kieAiApiKey to downloadFile
        await downloadFile(image.imageUrl, filename, kieAiApiKey);
        alert(`"${image.prompt}" 이미지 다운로드 시작! 파일명: ${filename}`);
    } catch (err: any) {
        console.error(`[handleModalImageDownload] Download failed for "${image.prompt}":`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`"${image.prompt}" 이미지 다운로드 실패: ${errorMessage}`);
        setError(`개별 이미지 다운로드 실패: ${errorMessage}`); // Set error on UI
    }
  }, [getDownloadInfo, kieAiApiKey]); // Dependency: kieAiApiKey

  // Handler for opening image in new tab (manual download fallback)
  const handleModalOpenImageInNewTab = useCallback((image: KieAiImageGenerationResponse) => {
    console.log("[handleModalOpenImageInNewTab] Opening image in new tab (manual download fallback).");
    if (image.imageUrl) {
      window.open(image.imageUrl, '_blank');
    } else {
      alert('이미지 URL을 찾을 수 없습니다.');
    }
  }, []);


  // REMOVED: handleDownloadAllImages function


  // Helper to determine the Kie.ai 4o Image API's actual aspect ratio mapping
  const getKieAi4oImageApiAspectRatio = useCallback((appAspectRatio: string): string => {
    switch (appAspectRatio) {
      case '1:1': return '1:1';
      case '16:9':
      case '4:3': 
      case '21:9': // New aspect ratio
      case '3:2': // Added as a direct option
        return '3:2'; // Closest landscape for 4o Image API
      case '9:16':
      case '3:4':
      case '16:21': // New aspect ratio
      case '2:3': // Added as a direct option
        return '2:3'; // Closest portrait for 4o Image API
      default: return '1:1';
    }
  }, []);

  const isZImageSelected = selectedImageModel === 'kie-z-image';
  const Z_IMAGE_MAX_PROMPT_LENGTH_UI = 1000;
  const isGrokImagineSelected = selectedImageModel === 'kie-grok-imagine';
  // Removed effectiveGrokImagineImageSize as Grok Imagine now uses aspectRatio directly


  return (
    <div className="bg-gray-50 dark:bg-gray-900 flex flex-col items-center p-4 sm:p-6 lg:p-8 transition-colors duration-200 h-full">
      <div className="w-full max-w-6xl flex justify-between items-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-50 text-center flex-grow">
          AI 이미지 프롬프트 및 생성기
        </h1>
        <div className="flex items-center space-x-2"> {/* Container for API Key button and DarkModeToggle */}
          {/* RE-ADDED: API Key setting button */}
          <Button
            onClick={() => setShowApiKeyModal(true)}
            disabled={isGlobalLoading}
            variant="secondary"
            size="sm"
            className="flex-shrink-0" // Prevent button from growing
            title="API 키 설정/변경"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.17.992c.381.22.755.474 1.12.753l.97-.242c.563-.141 1.166.183 1.341.713l.867 2.1c.176.53.029 1.15-.384 1.488l-.744.591a7.71 7.71 0 010 1.96l.744.591c.413.339.56 1.008.384 1.488l-.867 2.1c-.175.53-.778.854-1.341-.713l-.97-.242c-.365.279-.739.533-1.12-.753l-.17.992c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.17-.992c-.381-.22-.755-.474-1.12-.753l-.97.242c-.563.141-1.166-.183-1.341-.713l-.867-2.1c-.176-.53-.029-1.15.384-1.488l.744-.591a7.71 7.71 0 010-1.96l-.744-.591c-.413-.339-.56-1.008-.384-1.488l.867-2.1c.175-.53.778-.854 1.341-.713l.97.242c.365-.279.739-.533 1.12-.753l.17-.992z" />
              <path strokeLinecap="round" strokeLineJoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            API 키 설정/변경
          </Button>
          <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </div>
      </div>

      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mb-8 transition-colors duration-200 flex-grow flex flex-col"> {/* Added flex-grow and flex flex-col */}
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-5">
          1. 이미지 프롬프트 및 이미지 생성
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start flex-grow"> {/* Added flex-grow */}
          <div className="lg:col-span-1"> {/* Removed overflow-y-auto pr-2 custom-scrollbar */}
            <PromptBuilder
              onStructuredPromptChange={handleStructuredPromptChange}
              initialCategory={category} initialStyle={style} initialCharacter={character}
              initialDescription={description} initialAngle={angle} initialShotType={shotType}
              initialLighting={lighting} initialComposition={composition} initialSkinColor={skinColor}
              initialHairStyle={hairStyle}
              initialGender={gender} initialAgeRange={ageRange} // NEW
              initialClothingStyle={clothingStyle} initialAccessoriesSelection={accessoriesSelection}
              initialHats={hats} initialGlasses={glasses} // NEW
              initialBodyType={bodyType}
              initialPersonalityTraits={personalityTraits} // New prop
              initialBackstory={backstory} // New prop
              initialCameraGear={cameraGear} // New prop
              initialFilter={filter} // New prop
              initialCharacterReferenceImage={characterReferenceImage} // New prop
              initialCharacterReferenceImageFileName={characterReferenceImageFileName} // New prop for file name
              onCharacterReferenceChange={handleCharacterReferenceChange} // Corrected prop name
              disabled={isOperationDisabled}
            />
          </div>

          <div className="lg:col-span-1 flex flex-col space-y-6"> {/* Removed overflow-y-auto pr-2 custom-scrollbar */}
            <div>
              <Button
                onClick={handleGeneratePrompt}
                loading={isLoadingPrompt}
                disabled={isPromptGenerateDisabled || isOperationDisabled}
                className="w-full"
              >
                프롬프트 생성
              </Button>
            </div>

            <CollapsibleSection
              title="생성된 프롬프트 (수정 가능)"
              isOpen={isGeneratedPromptSectionOpen}
              onToggle={() => setIsGeneratedPromptSectionOpen(!isGeneratedPromptSectionOpen)}
            >
              <div className="flex flex-col space-y-3">
                <TextInput
                  id="editable-generated-prompt"
                  label=""
                  type="textarea"
                  placeholder="AI가 생성한 프롬프트가 여기에 표시됩니다. 직접 입력하거나 수정할 수 있습니다."
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  rows={8}
                  disabled={isOperationDisabled}
                  className="resize-y" // Allow vertical resizing
                />
                {isZImageSelected && (
                  <p className={`text-sm mt-1 ${generatedPrompt.length > Z_IMAGE_MAX_PROMPT_LENGTH_UI ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                    (현재 {generatedPrompt.length}자 / Z-Image 모델 최대 {Z_IMAGE_MAX_PROMPT_LENGTH_UI}자)
                    {generatedPrompt.length > Z_IMAGE_MAX_PROMPT_LENGTH_UI && ' ⚠️ 프롬프트가 너무 깁니다.'}
                  </p>
                )}
                <Button
                  onClick={handleCopyPrompt}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={copyStatus === 'copied' || isOperationDisabled || !generatedPrompt.trim()}
                >
                  {copyStatus === 'copied' ? '복사됨!' : (copyStatus === 'failed' ? '복사 실패' : '프롬프트 복사')}
                </Button>
              </div>
            </CollapsibleSection>

            <div className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner border border-gray-200 dark:border-gray-600 min-h-[250px] text-gray-600 dark:text-gray-300 flex-grow">
              {isOperationDisabled ? (
                <>
                  <LoadingSpinner />
                  <p className="mt-2 text-center">
                    {/* Updated loading message, removed batch download specifics */}
                    {isAnyKeyMissing || showApiKeyModal ? 'API 키 입력 필요...' : 
                     (isLoadingPrompt ? '프롬프트 생성 중...' :
                      (isEditingImage ? '이미지 편집 중...' : '이미지 생성 중...')
                     )}
                  </p>
                </>
              ) : generatedImages.length > 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <p className="text-md mb-3 font-semibold text-gray-800 dark:text-gray-100">최신 생성 이미지 미리보기:</p>
                  <img
                    src={generatedImages[0].imageUrl}
                    alt="프리뷰"
                    className="max-w-[350px] max-h-[350px] object-contain rounded-md shadow-md border border-gray-300 dark:border-gray-600"
                  />
                </div>
              ) : generatedPrompt ? (
                <p className="text-center text-base">
                  프롬프트가 생성되었거나 입력되었습니다. 이미지 생성을 위해 {'"이미지 생성"'} 버튼을 눌러주세요.
                </p>
              ) : (
                <p className="text-center text-base">
                  프롬프트를 생성하면 이미지가 여기에 미리보기로 표시됩니다.
                </p>
              )}
            </div>

            {availableImageModels.length > 0 && (
              <>
                <Dropdown
                  id="imageModelSelect"
                  label="이미지 모델 선택:"
                  options={availableImageModels.map((model) => ({
                    value: model.id,
                    label: model.name,
                    description: model.description, // Pass description for tooltips
                  }))}
                  value={selectedImageModel}
                  onChange={(e) => setSelectedImageModel(e.target.value)}
                  disabled={isOperationDisabled || !generatedPrompt.trim()}
                />
                <Dropdown
                  id="aspectRatioSelect"
                  label="이미지 비율 선택:"
                  options={aspectRatioOptions}
                  value={selectedAspectRatio}
                  onChange={(e) => setSelectedAspectRatio(e.target.value)}
                  disabled={isOperationDisabled || !generatedPrompt.trim()}
                />
                {isKieAi4oImageModel(selectedImageModel) && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-[-10px] mb-4">
                    ⚠️ Kie.ai 4o Image API는 `1:1`, `3:2`, `2:3` 비율만 지원합니다. 선택하신 '{
                      aspectRatioOptions.find(opt => opt.value === selectedAspectRatio)?.label || selectedAspectRatio
                    }'은(는) API에서 가장 가까운 '{getKieAi4oImageApiAspectRatio(selectedAspectRatio)}' 비율로 생성됩니다.
                  </p>
                )}
                {isGrokImagineSelected && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-[-10px] mb-4">
                    ⚠️ Grok Imagine 모델은 `1:1`, `3:2`, `2:3` 비율을 지원합니다. 선택하신 '{
                      aspectRatioOptions.find(opt => opt.value === selectedAspectRatio)?.label || selectedAspectRatio
                    }'은(는) API에서 '{mapToGrokImagineAspectRatio(selectedAspectRatio)}'으로(으로) 조정됩니다.
                  </p>
                )}
                {(isKieAiSeedream4Model(selectedImageModel) || isKieAiFlux2ProModel(selectedImageModel) || isKieAiMidjourneyModel(selectedImageModel) || isKieAiZImageModel(selectedImageModel) || isKieAiQwenModel(selectedImageModel)) && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-[-10px] mb-4">
                    ⚠️ '{availableImageModels.find(opt => opt.id === selectedImageModel)?.name}' 모델은 선택하신 비율 및 품질에 따라 API 내부에서 최적화된 해상도로 이미지를 생성합니다.
                  </p>
                )}
                {/* Image Quality Dropdown - only enabled for specific models */}
                <Dropdown
                  id="imageQualitySelect"
                  label="이미지 품질/해상도:"
                  options={imageQualityOptions}
                  value={imageQuality}
                  onChange={(e) => setImageQuality(e.target.value)}
                  disabled={
                    isOperationDisabled || !generatedPrompt.trim() ||
                    !(selectedImageModel === 'kie-gemini-pro-image' || selectedImageModel === 'kie-imagen-4' || isKieAiSeedream4Model(selectedImageModel) || isKieAiFlux2ProModel(selectedImageModel) || isKieAiMidjourneyModel(selectedImageModel) || isKieAiZImageModel(selectedImageModel) || isKieAiQwenModel(selectedImageModel) || isGrokImagineSelected)
                  }
                  title={
                    (selectedImageModel === 'kie-gemini-pro-image' || selectedImageModel === 'kie-imagen-4' || isKieAiSeedream4Model(selectedImageModel) || isKieAiFlux2ProModel(selectedImageModel) || isKieAiMidjourneyModel(selectedImageModel) || isKieAiZImageModel(selectedImageModel) || isKieAiQwenModel(selectedImageModel) || isGrokImagineSelected)
                      ? undefined
                      : '이 모델은 고품질/해상도 옵션을 지원하지 않습니다.'
                  }
                />
              </>
            )}
            {availableImageModels.length === 0 && !error && !isLoadingPrompt && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                이미지 모델 로드 중...
              </p>
            )}
            
            <Button
              onClick={handleGenerateImage}
              loading={isLoadingImage || isEditingImage}
              disabled={isOperationDisabled || !generatedPrompt.trim() || !selectedImageModel || !selectedAspectRatio || (isZImageSelected && generatedPrompt.length > Z_IMAGE_MAX_PROMPT_LENGTH_UI)}
              className="w-full mt-4"
            >
              이미지 생성
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="w-full max-w-6xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-8 dark:bg-red-950 dark:border-red-700 dark:text-red-300 transition-colors duration-200"
          role="alert"
        >
          <strong className="font-bold">오류!</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {isLoadingPrompt && (
        <div className="mb-8">
          <LoadingSpinner />
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            프롬프트 생성 중...

          </p>
        </div>
      )}

      {generatedImages.length > 0 && (
        <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-5">
            생성된 이미지 전체 목록
          </h2>
          {showMockModelWarning && (
            <div
              className="w-full bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-300"
              role="alert"
            >
              <strong className="font-bold">모의 모델 경고:</strong>
              <span className="block sm:inline ml-2">선택된 모델은 현재 모의 서비스로 동작합니다. 실제 이미지가 아닌 예시 이미지가 생성됩니다.</span>
            </div>
          )}
          {/* REMOVED: Batch download button */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"> {/* Increased grid columns for thumbnails */}
            {generatedImages.map((img, index) => (
              <ImageDisplay key={index} image={img} onClick={openImageDetailModal} />
            ))}
          </div>
        </div>
      )}

      <ImageDetailModal
        isOpen={isModalOpen}
        onClose={closeImageDetailModal}
        image={selectedImageForModal}
        onDownload={handleModalImageDownload} // RE-ADDED: Pass the download handler
        onOpenInNewTab={handleModalOpenImageInNewTab} // Pass handler for opening in new tab
        onEditSubmit={handleEditImage} // Pass the new edit handler
        isLoadingImage={isLoadingImage || isEditingImage} // Pass global loading state
        canEditCurrentModel={canEditCurrentSelectedModel} // Whether the current *selected* model supports editing
        systemHasEditingModels={availableEditingModels.length > 0} // Whether *any* editing models are available in the system
        availableEditingModels={availableEditingModels} // Pass available editing models to the modal
        // REMOVED: isModalImageKieAiHosted={selectedImageForModal ? isKieAiHostedImageUrl(selectedImageForModal.imageUrl) : false}
      />

      {/* RE-ADDED: API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        geminiApiKeyInput={geminiApiKeyInput}
        setGeminiApiKeyInput={setGeminiApiKeyInput}
        kieAiApiKeyInput={kieAiApiKeyInput}
        setKieAiApiKeyInput={setKieAiApiKeyInput}
        onSave={handleSaveApiKeys}
        onRemove={handleRemoveApiKeys}
        isLoading={isGlobalLoading}
        error={error}
        geminiApiKeyStored={!!geminiApiKey}
        kieAiApiKeyStored={!!kieAiApiKey}
      />
    </div>
  );
};

export default App;