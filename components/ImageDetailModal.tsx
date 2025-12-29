import React, { useEffect, useRef, useState, useCallback } from 'react';
import { KieAiImageGenerationResponse, KieAiImageModel } from '../types';
import Button from './Button';
import TextInput from './TextInput'; // Import TextInput
import Dropdown from './Dropdown'; // Import Dropdown for model selection

interface ImageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: KieAiImageGenerationResponse | null;
  onDownload: (image: KieAiImageGenerationResponse) => void; // RE-ADDED: onDownload prop
  onOpenInNewTab: (image: KieAiImageGenerationResponse) => void;
  onEditSubmit: (originalImage: KieAiImageGenerationResponse, editPrompt: string, editingModelId: string) => void; // New prop for edit handler with editingModelId
  isLoadingImage: boolean; // New prop for global image loading state (generation or edit)
  canEditCurrentModel: boolean; // New prop: Tells if the MAIN selected model in App.tsx is an editing model
  systemHasEditingModels: boolean; // New prop: Tells if *any* editing models are available in the system
  availableEditingModels: KieAiImageModel[]; // New prop: List of models that support editing
  // REMOVED: isModalImageKieAiHosted: boolean;
}

const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ isOpen, onClose, image, onDownload, onOpenInNewTab, onEditSubmit, isLoadingImage, canEditCurrentModel, systemHasEditingModels, availableEditingModels /* REMOVED: isModalImageKieAiHosted */ }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedEditingModel, setSelectedEditingModel] = useState<string>(''); // New state for model selected in modal

  // Helper function to determine if a given URL is likely hosted by Kie.ai.
  // This is defined locally for debugging purposes within this component.
  const isKieAiHostedImageUrl = (url: string): boolean => {
    return url.includes('kie.ai') || url.includes('redpandaai.co') || url.includes('tempfile.1f6c');
  };

  // Reset editing mode and prompt when modal opens/closes or image changes
  useEffect(() => {
    if (!isOpen) {
      setIsEditingMode(false);
      setEditPrompt('');
      setSelectedEditingModel(''); // Reset selected editing model
    } else {
      // When modal opens in edit mode, pre-select the first available editing model
      if (availableEditingModels.length > 0) {
        setSelectedEditingModel(availableEditingModels[0].id);
      }
      // DEBUG LOGGING: Log image URL and host status when modal is open
      if (image) {
        console.log(`[ImageDetailModal Debug] Image URL: ${image.imageUrl}`);
        // Log image URL to ensure it's not empty or malformed
        if (!image.imageUrl || image.imageUrl === 'data:image/svg+xml;base64,...') {
          console.warn(`[ImageDetailModal Debug] Image URL is empty or placeholder: ${image.imageUrl}`);
        }
        console.log(`[ImageDetailModal Debug] Is Kie.ai Hosted (computed): ${isKieAiHostedImageUrl(image.imageUrl)}`);
      }
    }
  }, [isOpen, availableEditingModels, image]);


  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling background
    } else {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  const handleEditClick = useCallback(() => {
    setIsEditingMode(true);
    setEditPrompt(''); // Clear previous edit prompt when entering edit mode
    // Ensure a model is pre-selected if available
    if (availableEditingModels.length > 0 && !selectedEditingModel) {
      setSelectedEditingModel(availableEditingModels[0].id);
    }
  }, [availableEditingModels, selectedEditingModel]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingMode(false);
    setEditPrompt('');
    setSelectedEditingModel(''); // Clear selected editing model
  }, []);

  const handleSubmitEdit = useCallback(() => {
    if (image && editPrompt.trim() && selectedEditingModel) {
      onEditSubmit(image, editPrompt, selectedEditingModel); // Pass selected editing model
    } else if (editPrompt.trim().length === 0) {
      alert('편집할 내용을 입력해주세요.');
    } else if (!selectedEditingModel) {
      alert('이미지 편집에 사용할 모델을 선택해주세요.');
    }
  }, [image, editPrompt, selectedEditingModel, onEditSubmit]);


  if (!isOpen || !image) return null;

  // Determine if the image URL is a data URL
  const isDataUrl = image.imageUrl.startsWith('data:');

  // Determine which warning/message to show
  const showMockWarning = image.isMock;
  // Adjusted warning logic for editing button state vs. modal edit mode
  const showNoSystemEditingModelsWarning = !systemHasEditingModels && !isLoadingImage; // If no editing models exist at all
  const showModelNotSelectedInModalWarning = isEditingMode && !selectedEditingModel && availableEditingModels.length > 0; // If in edit mode but no editing model is selected
  const showEditButtonDisabledWarning = !isEditingMode && (!systemHasEditingModels || showMockWarning); // Warning for the edit button itself

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="image-detail-title"
    >
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all sm:align-middle p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="모달 닫기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 id="image-detail-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          이미지 상세 정보
        </h3>

        <div className="flex flex-col items-center">
          <img
            src={image.imageUrl}
            alt={`${image.model}으로 생성됨`}
            className="max-w-full h-auto object-contain rounded-md mb-6 border border-gray-200 dark:border-gray-600 max-h-[60vh]"
            loading="lazy"
          />

          {showMockWarning && (
            <div
              className="w-full bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-300"
              role="alert"
            >
              <strong className="font-bold">모의 이미지:</strong>
              <span className="block sm:inline ml-2">이 이미지는 모의 API 응답을 통해 생성된 것입니다. 실제 이미지가 아닙니다.</span>
            </div>
          )}

          {isEditingMode ? (
            <div className="w-full space-y-4">
              <Dropdown
                id="editingModelSelect"
                label="이미지 편집 모델 선택:"
                options={availableEditingModels.map(model => ({
                  value: model.id,
                  label: model.name,
                  description: model.description
                }))}
                value={selectedEditingModel}
                onChange={(e) => setSelectedEditingModel(e.target.value)}
                disabled={isLoadingImage || availableEditingModels.length === 0}
                className="mb-4"
              />
              {showNoSystemEditingModelsWarning && (
                <div className="mt-4 text-base font-semibold text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900 p-4 rounded-md border border-red-300 dark:border-red-700 shadow-md" role="alert">
                  <p>❌ <strong>오류:</strong> 현재 이미지 편집을 지원하는 모델이 시스템에 없습니다.</p>
                  <p className="mt-2">관리자에게 문의하거나 나중에 다시 시도해주세요.</p>
                </div>
              )}
              {showModelNotSelectedInModalWarning && (
                <div className="mt-4 text-base font-semibold text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900 p-4 rounded-md border border-yellow-300 dark:border-yellow-700 shadow-md" role="alert">
                  <p>⚠️ <strong>알림:</strong> 편집 모델을 선택해야 합니다.</p>
                  <p className="mt-2">드롭다운에서 이미지 편집에 사용할 모델을 선택해주세요.</p>
                </div>
              )}
              <TextInput
                id="edit-prompt"
                label="편집할 내용을 입력해주세요:"
                placeholder="예: 인물의 머리카락을 더 길게 해주세요, 배경에 나무를 추가해주세요"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={3}
                disabled={isLoadingImage || !selectedEditingModel}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleSubmitEdit}
                  loading={isLoadingImage}
                  disabled={isLoadingImage || !editPrompt.trim() || !selectedEditingModel}
                  className="w-full sm:flex-1"
                >
                  편집 요청
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  variant="secondary"
                  disabled={isLoadingImage}
                  className="w-full sm:flex-1"
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-300 w-full mb-6">
              <p className="font-semibold text-gray-800 dark:text-gray-100 break-words mb-2">프롬프트:</p>
              <p className="text-gray-700 dark:text-gray-200 mb-2 whitespace-pre-wrap">{image.prompt}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">모델:</p>
              <p className="text-gray-700 dark:text-gray-200">{image.model}</p>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                {/* RE-ADDED original "다운로드" button */}
                <Button
                  onClick={() => onDownload(image)}
                  variant="secondary"
                  className="w-full sm:flex-1"
                  aria-label={`"${image.prompt}" 이미지 다운로드`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  다운로드
                </Button>
                {/* Reverted "새 탭에서 이미지 열기" button text */}
                <Button
                  onClick={() => onOpenInNewTab(image)}
                  variant="secondary"
                  className="w-full sm:flex-1"
                  aria-label={`"${image.prompt}" 새 탭에서 이미지 열기`}
                  title={isDataUrl ? "참고: 이 이미지는 Data URL 형식으로, 새 탭에서 직접 Base64 문자열로 표시될 수 있습니다. 브라우저의 '다른 이름으로 저장' 기능을 사용하세요." : undefined}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  새 탭에서 이미지 열기
                </Button>
                <Button
                  onClick={handleEditClick}
                  variant="primary"
                  className="w-full sm:flex-1"
                  aria-label={`"${image.prompt}" 이미지 편집`}
                  disabled={isLoadingImage || showMockWarning || !systemHasEditingModels} // Disabled if loading, mock, or no editing models
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  이미지 편집
                </Button>
              </div>
              {showEditButtonDisabledWarning && !showMockWarning && ( // Show general warning only if not mock and editing is not possible
                <div className="mt-4 text-base font-semibold text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900 p-4 rounded-md border border-yellow-300 dark:border-yellow-700 shadow-md" role="alert">
                  <p>⚠️ <strong>알림:</strong> 현재 이미지 편집을 지원하는 모델이 없거나, 활성화되지 않았습니다.</p>
                  <p className="mt-2">편집을 지원하는 모델은 '나노바나나', '나노바나나 프로', 'Imagen 4.0' 입니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageDetailModal;