import React, { useState, useEffect, useCallback } from 'react';
import Button from './Button';
import TextInput from './TextInput';
import { testGeminiApiKey } from '../services/geminiService'; // Import new function
import { KieAiService } from '../services/kieAiService'; // Import KieAiService for new function

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiApiKeyInput: string;
  setGeminiApiKeyInput: (key: string) => void;
  kieAiApiKeyInput: string;
  setKieAiApiKeyInput: (key: string) => void;
  onSave: () => void;
  onRemove: () => void;
  isLoading: boolean;
  error: string | null;
  geminiApiKeyStored: boolean; // Indicates if Gemini key is currently in localStorage
  kieAiApiKeyStored: boolean; // Indicates if Kie.ai key is currently in localStorage
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  geminiApiKeyInput,
  setGeminiApiKeyInput,
  kieAiApiKeyInput,
  setKieAiApiKeyInput,
  onSave,
  onRemove,
  isLoading,
  error,
  geminiApiKeyStored,
  kieAiApiKeyStored,
}) => {
  // New states for API key testing
  const [geminiTestStatus, setGeminiTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [geminiTestMessage, setGeminiTestMessage] = useState<string>('');
  const [kieAiTestStatus, setKieAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [kieAiTestMessage, setKieAiTestMessage] = useState<string>('');
  const [kieAiCredits, setKieAiCredits] = useState<number | null>(null);

  // Reset test statuses when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGeminiTestStatus('idle');
      setGeminiTestMessage('');
      setKieAiTestStatus('idle');
      setKieAiTestMessage('');
      setKieAiCredits(null);
    }
  }, [isOpen]);

  const handleTestGeminiKey = useCallback(async () => {
    setGeminiTestStatus('testing');
    setGeminiTestMessage('');
    try {
      const result = await testGeminiApiKey(geminiApiKeyInput);
      if (result.success) {
        setGeminiTestStatus('success');
        setGeminiTestMessage(result.message);
      } else {
        setGeminiTestStatus('failed');
        setGeminiTestMessage(result.message);
      }
    } catch (err: any) {
      setGeminiTestStatus('failed');
      setGeminiTestMessage(`테스트 중 예상치 못한 오류: ${err.message || '알 수 없음'}`);
    }
  }, [geminiApiKeyInput]);

  const handleTestKieAiKey = useCallback(async () => {
    setKieAiTestStatus('testing');
    setKieAiTestMessage('');
    setKieAiCredits(null); // Clear previous credits
    try {
      const result = await KieAiService.checkKieAiCredits(kieAiApiKeyInput);
      if (result.success) {
        setKieAiTestStatus('success');
        setKieAiTestMessage(result.message);
        setKieAiCredits(result.credits);
      } else {
        setKieAiTestStatus('failed');
        setKieAiTestMessage(result.message);
      }
    } catch (err: any) {
      setKieAiTestStatus('failed');
      setKieAiTestMessage(`테스트 중 예상치 못한 오류: ${err.message || '알 수 없음'}`);
    }
  }, [kieAiApiKeyInput]);

  if (!isOpen) return null;

  const isTesting = geminiTestStatus === 'testing' || kieAiTestStatus === 'testing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="모달 닫기"
          disabled={isLoading || isTesting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          API 키 설정
        </h3>

        <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
          ⚠️ 이 애플리케이션은 Google의 `@google/genai` 코딩 가이드라인과 다르게 API 키를 직접 입력받아 `localStorage`에 저장합니다. 프로덕션 환경에서는 `process.env.API_KEY`를 사용하는 것이 권장됩니다.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 dark:bg-red-950 dark:border-red-700 dark:text-red-300" role="alert">
            <strong className="font-bold">오류:</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div> {/* Container for Gemini key input and test button */}
            <TextInput
              id="gemini-api-key"
              label="Google Gemini/Imagen API 키:"
              type="password"
              placeholder="Gemini API 키 입력"
              value={geminiApiKeyInput}
              onChange={(e) => {
                setGeminiApiKeyInput(e.target.value);
                setGeminiTestStatus('idle'); // Reset status on input change
                setGeminiTestMessage('');
              }}
              disabled={isLoading || isTesting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-[-10px]">
              Google Gemini 또는 Imagen 모델을 사용할 때 필요합니다. (예: `AIza...`)
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Button
                onClick={handleTestGeminiKey}
                loading={geminiTestStatus === 'testing'}
                disabled={isLoading || isTesting || !geminiApiKeyInput.trim()}
                variant="secondary"
                size="sm"
              >
                {geminiTestStatus === 'testing' ? '테스트 중...' : 'Gemini 키 테스트'}
              </Button>
              {geminiTestStatus === 'success' && (
                <span className="text-green-600 dark:text-green-400 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {geminiTestMessage}
                </span>
              )}
              {geminiTestStatus === 'failed' && (
                <span className="text-red-600 dark:text-red-400 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.174 3.374 1.98 3.374h14.71c1.806 0 2.852-1.874 1.98-3.374L13.94 3.376c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {geminiTestMessage}
                </span>
              )}
            </div>
          </div>

          <div> {/* Container for Kie.ai key input and test button */}
            <TextInput
              id="kie-ai-api-key"
              label="Kie.ai API 키:"
              type="password"
              placeholder="Kie.ai API 키 입력"
              value={kieAiApiKeyInput}
              onChange={(e) => {
                setKieAiApiKeyInput(e.target.value);
                setKieAiTestStatus('idle'); // Reset status on input change
                setKieAiTestMessage('');
                setKieAiCredits(null);
              }}
              disabled={isLoading || isTesting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-[-10px]">
              Kie.ai 기반 모델(4o Image, Flux Kontext, Seedream, Midjourney 등)을 사용할 때 필요합니다.
              (<a href="https://kie.ai/api-key" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Kie.ai API 키 발급</a>)
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Button
                onClick={handleTestKieAiKey}
                loading={kieAiTestStatus === 'testing'}
                disabled={isLoading || isTesting || !kieAiApiKeyInput.trim()}
                variant="secondary"
                size="sm"
              >
                {kieAiTestStatus === 'testing' ? '테스트 중...' : 'Kie.ai 키 테스트'}
              </Button>
              {kieAiTestStatus === 'success' && (
                <span className="text-green-600 dark:text-green-400 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {kieAiTestMessage}
                  {typeof kieAiCredits === 'number' && ` (남은 크레딧: ${kieAiCredits})`}
                </span>
              )}
              {kieAiTestStatus === 'failed' && (
                <span className="text-red-600 dark:text-red-400 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.174 3.374 1.98 3.374h14.71c1.806 0 2.852-1.874 1.98-3.374L13.94 3.376c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {kieAiTestMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onSave}
            loading={isLoading}
            disabled={isLoading || isTesting || !geminiApiKeyInput.trim() || !kieAiApiKeyInput.trim()}
            className="w-full sm:flex-1"
          >
            저장
          </Button>
          <Button
            onClick={onRemove}
            variant="secondary"
            disabled={isLoading || isTesting || (!geminiApiKeyStored && !kieAiApiKeyStored)}
            className="w-full sm:flex-1"
          >
            모든 키 삭제
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;