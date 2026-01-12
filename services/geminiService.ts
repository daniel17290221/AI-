import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ReferenceImage } from '../types'; // Import ReferenceImage

interface SubtitleInput {
  text: string;
  emphasized: boolean;
}

interface StructuredPromptInput {
  mainTopic?: string; // New: main user-provided topic
  category: string[];
  style: string[];
  filter: string[];
  character: string;
  description: string;
  angle: string[];
  shotType: string[];
  lighting: string[];
  composition: string[];
  skinColor: string[];
  hairStyle: string[];
  gender: string[]; // NEW
  ageRange: string[]; // NEW
  clothingStyle: string[]; // NEW
  accessoriesSelection: string[]; // NEW
  hats: string[]; // NEW
  glasses: string[]; // NEW
  bodyType: string[];
  accessories: string; // Keep for now for backward compatibility, but actual value will be ''
  personalityTraits: string;
  backstory: string;
  cameraGear: string[];
  imageQuality: string; // New: selected image quality
  characterReferenceImages?: ReferenceImage[]; // CHANGED: Now an array of ReferenceImage
  subtitles?: SubtitleInput[]; // New: array of subtitles with emphasis flag
}

export const generateImagePrompt = async (
  input: string | StructuredPromptInput,
  geminiApiKey: string, // Re-added geminiApiKey parameter
): Promise<string> => {
  try {
    if (!geminiApiKey) {
      throw new Error("Gemini API 키가 제공되지 않았습니다.");
    }
    console.log(`[Gemini Service] generateImagePrompt called. API Key present: ${!!geminiApiKey}`);

    const ai = new GoogleGenAI({ apiKey: geminiApiKey }); // Use provided geminiApiKey
    const model = "gemini-flash-latest";

    let promptContent: string;
    if (typeof input === 'string') {
      promptContent = `다음 사용자 아이디어에 기반하여 창의적이고 상세한 이미지 생성 프롬프트를 만드세요. 프롬프트는 설명적이고 예술적이며, 이미지 생성 AI에 바로 사용할 수 있어야 합니다. 800자 이내로 작성해주세요.
      사용자 아이디어: "${input}"

      예시:
      "황혼 속의 미래 도시 풍경, 젖은 거리에 네온 불빛이 반사되고, 비행 차량들이 오가는 블레이드 러너 스타일의 고도로 상세한 시네마틱 조명."`;
    } else {
      const {
        mainTopic, // New
        category,
        style,
        filter,
        character,
        description,
        angle,
        shotType,
        lighting,
        composition,
        skinColor,
        hairStyle,
        gender, // NEW
        ageRange, // NEW
        clothingStyle, // NEW
        accessoriesSelection, // NEW
        hats, // NEW
        glasses, // NEW
        bodyType,
        accessories, // Keep for backward compatibility, but will be empty
        personalityTraits,
        backstory,
        cameraGear,
        imageQuality, // New
        characterReferenceImages, // CHANGED
        subtitles, // New
      } = input;

      let structuredPromptParts = [];

      // Add instruction for reference image(s) if present
      if (characterReferenceImages && characterReferenceImages.length > 0) {
        structuredPromptParts.push(`**제공된 ${characterReferenceImages.length > 1 ? '여러' : ''} 인물 이미지를 강력하게 참조하여 생성해주세요.**`);
      }

      // Main topic (if provided by user)
      if (mainTopic) {
        structuredPromptParts.push(`주제: ${mainTopic}`);
      }

      // Helper to process array fields
      const addArrayField = (label: string, values: string[]) => {
        const filteredValues = values.filter(v => v && v !== '선택 안함');
        if (filteredValues.length > 0) {
          structuredPromptParts.push(`${label}: ${filteredValues.join(', ')}`);
        }
      };

      addArrayField('카테고리', category);
      addArrayField('스타일', style);
      addArrayField('필터', filter);
      if (character) structuredPromptParts.push(`주요 인물/객체: ${character}`);
      addArrayField('성별', gender); // NEW
      addArrayField('연령대', ageRange); // NEW
      if (personalityTraits) structuredPromptParts.push(`성격/특징: ${personalityTraits}`);
      if (backstory) structuredPromptParts.push(`배경 스토리: ${backstory}`);

      addArrayField('피부색', skinColor);
      addArrayField('머리 스타일', hairStyle);
      addArrayField('의상', clothingStyle); // NEW
      addArrayField('체형', bodyType);
      addArrayField('악세서리', accessoriesSelection); // NEW
      addArrayField('모자', hats); // NEW
      addArrayField('안경/고글', glasses); // NEW
      
      addArrayField('앵글', angle);
      addArrayField('샷 종류', shotType);
      addArrayField('조명', lighting);
      addArrayField('구도', composition);
      addArrayField('장비', cameraGear);

      // Add image quality only if it's not "표준" or "1K" and is meaningful
      if (imageQuality && imageQuality !== '1K (표준)' && imageQuality !== '1K') { // Adjust for "1K (표준)" label
        structuredPromptParts.push(`이미지 품질: ${imageQuality}`);
      }

      if (description) structuredPromptParts.push(`추가 세부 묘사: ${description}`);

      // Add subtitles
      if (subtitles && subtitles.length > 0) {
        subtitles.forEach(subtitle => {
          if (subtitle.text.trim()) {
            structuredPromptParts.push(
              subtitle.emphasized ? `**${subtitle.text.trim()}**` : subtitle.text.trim()
            );
          }
        });
      }

      const structuredInputString = structuredPromptParts.join(', ');

      // Emphasized prompt length guidance to 800 characters
      promptContent = `다음 요소를 사용하여 창의적이고 상세하며 시각적으로 풍부한 이미지 생성 프롬프트를 작성해주세요. 프롬프트는 이미지 생성 AI에 바로 사용할 수 있도록 800자 이내로 작성되어야 합니다.
      제공된 요소: ${structuredInputString}.
      이 요소들을 자연스럽게 연결하고, 필요하다면 추가적인 예술적 설명을 덧붙여 하나의 완벽한 이미지 프롬프트를 만들어주세요. 특정 모델의 요구사항을 고려하여 설명적이고 구체적인 용어를 사용해주세요.

      예시:
      "황혼 속의 미래 도시 풍경, 젖은 거리에 네온 불빛이 반사되고, 비행 차량들이 오가는 블레이드 러너 스타일의 고도로 상세한 시네마틱 조명, 높은 앵글, 사이버펑크 의상을 입은 아시아계 인물."`;
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: promptContent,
      config: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000, // Tokens for Gemini's internal generation
        thinkingConfig: { thinkingBudget: 300 },
      },
    });

    const promptText = response.text;
    if (!promptText) {
      throw new Error("Gemini did not return a prompt.");
    }
    return promptText.trim();
  } catch (rawError: any) { // Catch as any to inspect structure
    console.error("Error generating image prompt with Gemini:", rawError);
    let errorMessage = "알 수 없는 프롬프트 생성 오류가 발생했습니다.";

    // Attempt to parse Google API specific error format
    if (rawError && typeof rawError === 'object' && rawError.error && rawError.error.message) {
      errorMessage = rawError.error.message;
      if (rawError.error.status === "RESOURCE_EXHAUSTED") {
        errorMessage += ". Gemini API 할당량이 초과되었습니다. Google Cloud 콘솔에서 할당량 및 결제 정보를 확인해주세요.";
      } else if (rawError.error.details && rawError.error.details[0]?.reason === 'API_KEY_INVALID') {
        errorMessage = "Gemini API 키가 유효하지 않습니다. 올바른 키를 입력해주세요.";
      }
    } else if (rawError instanceof Error) {
      errorMessage = rawError.message;
    } else if (typeof rawError === 'string') {
      errorMessage = rawError;
    } else {
      errorMessage = JSON.stringify(rawError); // Fallback to stringify generic objects
    }

    throw new Error(
      `프롬프트 생성 실패: ${errorMessage}`
    );
  }
};

/**
 * Tests the validity of a Gemini API key by making a small API call.
 * @param apiKey The Gemini API key to test.
 * @returns An object indicating success and a message.
 */
export const testGeminiApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (!apiKey.trim()) {
      return { success: false, message: "API 키가 비어있습니다." };
    }
    console.log(`[Gemini Service] testGeminiApiKey called. API Key present: ${!!apiKey}`);

    const ai = new GoogleGenAI({ apiKey });
    // Attempt a very lightweight content generation to test the key
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest", // Use a common, lightweight model
      contents: "Hello",
      config: {
        maxOutputTokens: 10, // Keep it very small
        temperature: 0,
      },
    });

    if (response.text) {
      return { success: true, message: "Gemini API 키가 유효합니다." };
    } else {
      // Even if it doesn't throw, an empty response for a simple prompt might indicate an issue
      return { success: false, message: "응답을 받았으나 유효성 확인에 실패했습니다." };
    }
  } catch (error: any) {
    console.error("Gemini API 키 테스트 중 오류 발생:", error);
    let errorMessage = "알 수 없는 오류 발생.";

    if (error && error.message) {
      errorMessage = error.message;
      if (error.status === 401 || error.status === 403) { // Unauthorized/Forbidden
        errorMessage = "Gemini API 키가 유효하지 않거나 접근 권한이 없습니다.";
      } else if (error.status === 429) { // Rate limit
        errorMessage = "Gemini API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.";
      }
    }
    return { success: false, message: errorMessage };
  }
};