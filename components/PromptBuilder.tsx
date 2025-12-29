import React, { useState, useEffect } from 'react';
import ButtonSelectPanel from './ButtonSelectPanel'; // New button multi-select component
import TextInput from './TextInput';
import { DropdownOption } from './Dropdown'; // Reusing DropdownOption type
import CollapsibleSection from './CollapsibleSection'; // Import new CollapsibleSection component
import Button from './Button'; // Import Button for clear functionality

// Utility function to convert a File object to a base64 Data URL
const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const mimeTypeMatch = reader.result.match(/data:(.*?);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : file.type;
        const base64Data = reader.result.split(',')[1]; // Get only the base64 part
        resolve({ data: base64Data, mimeType });
      } else {
        reject(new Error("File could not be read as string."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


interface PromptBuilderProps {
  onStructuredPromptChange: (promptParts: {
    category: string[];
    style: string[];
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
    personalityTraits: string; // New
    backstory: string; // New
    cameraGear: string[]; // New
    filter: string[]; // New
  }) => void;
  initialCategory?: string[];
  initialStyle?: string[];
  initialCharacter?: string;
  initialDescription?: string;
  initialAngle?: string[];
  initialShotType?: string[];
  initialLighting?: string[];
  initialComposition?: string[];
  initialSkinColor?: string[];
  initialHairStyle?: string[];
  initialGender?: string[]; // NEW
  initialAgeRange?: string[]; // NEW
  initialClothingStyle?: string[]; // NEW
  initialAccessoriesSelection?: string[]; // NEW
  initialHats?: string[]; // NEW
  initialGlasses?: string[]; // NEW
  initialBodyType?: string[];
  initialPersonalityTraits?: string; // New
  initialBackstory?: string; // New
  initialCameraGear?: string[]; // New
  initialFilter?: string[]; // New
  initialCharacterReferenceImage?: { data: string; mimeType: string; } | null; // New
  initialCharacterReferenceImageFileName?: string | null; // New prop for file name
  onCharacterReferenceChange: (image: { data: string; mimeType: string; } | null, fileName: string | null) => void; // New param for file name
  disabled: boolean;
}

const categories: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '풍경', label: '풍경', description: '자연 경관이나 도시 전경.' },
  { value: '인물', label: '인물', description: '사람이나 캐릭터에 초점.' },
  { value: '동물', label: '동물', description: '다양한 동물의 모습.' },
  { value: '환상', label: '환상', description: '상상 속의 존재나 배경.' },
  { value: 'SF', label: 'SF', description: '미래 지향적 또는 공상 과학 요소.' },
  { value: '추상', label: '추상', description: '비구상적이거나 상징적인 이미지.' },
  { value: '음식', label: '음식', description: '요리나 식재료.' },
  { value: '건축', label: '건축', description: '건물이나 구조물.' },
  { value: '정물', label: '정물', description: '정지된 사물이나 꽃.' },
  { value: '도시', label: '도시', description: '번화가, 골목길 등 도시의 모습.' },
  { value: '자연', label: '자연', description: '숲, 바다, 산 등 자연 환경.' },
  { value: '역사', label: '역사', description: '특정 시대나 사건을 배경.' },
];

const styles: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '사실주의', label: '사실주의', description: '실제처럼 상세하고 현실적.' },
  { value: '수채화', label: '수채화', description: '물감으로 그린 듯한 부드러운 느낌.' },
  { value: '만화', label: '만화', description: '애니메이션이나 카툰풍.' },
  { value: '사이버펑크', label: '사이버펑크', description: '미래 도시의 어둡고 기술적인 분위기.' },
  { value: '유화', label: '유화', description: '유화 물감의 질감이 느껴지는 그림.' },
  { value: '픽셀 아트', label: '픽셀 아트', description: '픽셀 단위로 표현된 레트로 스타일.' },
  { value: '애니메이션', label: '애니메이션', description: '생동감 있는 그림체.' },
  { value: '초현실주의', label: '초현실주의', description: '꿈 같거나 비현실적인 이미지.' },
  { value: '미니멀리즘', label: '미니멀리즘', description: '단순하고 간결한 디자인.' },
  { value: '3D 렌더링', label: '3D 렌더링', description: '컴퓨터 그래픽으로 구현된 입체적 이미지.' },
  { value: '스케치', label: '스케치', description: '연필이나 펜으로 그린 듯한 초안.' },
  { value: '사진', label: '사진', description: '실제 사진처럼 선명하고 사실적.' },
];

// New dropdown options for advanced prompt building
const angles: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '버드 아이 뷰', label: '버드 아이 뷰', description: '위에서 아래로 내려다보는 시점.' },
  { value: '하이 앵글', label: '하이 앵글', description: '피사체를 위에서 비스듬히 내려다보는 시점.' },
  { value: '아이 레벨', label: '아이 레벨', description: '피사체와 같은 눈높이 시점.' },
  { value: '로우 앵글', label: '로우 앵글', description: '피사체를 아래에서 올려다보는 시점.' },
  { value: '웜스 아이 뷰', label: '웜스 아이 뷰', description: '땅바닥에서 올려다보는 극단적인 시점.' },
  { value: '네덜란드 앵글', label: '네덜란드 앵글', description: '카메라를 기울여 불안정한 느낌.' },
];

const shotTypes: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '익스트림 클로즈업', label: '익스트림 클로즈업', description: '특정 부위를 극도로 확대.' },
  { value: '클로즈업', label: '클로즈업', description: '얼굴 전체 또는 작은 부분에 집중.' },
  { value: '미디엄 샷', label: '미디엄 샷', description: '인물의 허리 위 또는 무릎 위.' },
  { value: '풀 샷', label: '풀 샷', description: '인물의 전신이 모두 보이는 샷.' },
  { value: '롱 샷', label: '롱 샷', description: '배경과 인물이 함께 보이는 넓은 샷.' },
  // Removed misplaced 'symmetry' keyword
  { value: '익스트림 롱 샷', label: '익스트림 롱 샷', description: '배경이 압도적으로 넓고 인물은 작게.' },
  { value: '오버 숄더 샷', label: '오버 숄더 샷', description: '인물 뒤에서 다른 인물을 찍는 샷.' },
];

const lightings: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '소프트 라이트', label: '소프트 라이트', description: '부드럽고 그림자가 약한 조명.' },
  { value: '하드 라이트', label: '하드 라이트', description: '강하고 그림자가 뚜렷한 조명.' },
  { value: '림 라이트', label: '림 라이트', description: '피사체의 윤곽을 강조하는 뒷조명.' },
  { value: '백 라이트', label: '백 라이트', description: '피사체 뒤에서 비추는 조명.' },
  { value: '자연광', label: '자연광', description: '햇빛이나 달빛 등 자연적인 조명.' },
  { value: '스튜디오 조명', label: '스튜디오 조명', description: '인공적인 스튜디오 환경의 조명.' },
  { value: '네온 조명', label: '네온 조명', description: '밝고 화려한 네온사인 조명.' },
  { value: '볼륨 조명', label: '볼륨 조명', description: '빛이 공간을 채우는 듯한 효과.' },
  { value: '시네마틱 조명', label: '시네마틱 조명', description: '영화처럼 극적이고 분위기 있는 조명.' },
];

const compositions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '삼분할법', label: '삼분할법', description: '화면을 3등분하여 중요 요소를 배치.' },
  { value: '황금 나선', label: '황금 나선', description: '황금비율에 따라 시선을 유도하는 나선형 구도.' },
  { value: '대칭', label: '대칭', description: '좌우 또는 상하가 균형 잡힌 안정적인 구도.' },
  { value: '비대칭', label: '비대칭', description: '불균형하지만 흥미로운 구도.' },
  { value: '프레이밍', label: '프레이밍', description: '다른 요소로 피사체를 감싸 강조.' },
  { value: '선행선', label: '선행선', description: '시선을 특정 방향으로 이끄는 선.' },
  { value: '피보나치 수열', label: '피보나치 수열', description: '자연스러운 비율로 요소를 배치.' },
];

const skinColors: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '밝은 피부', label: '밝은 피부', description: '연한 색상의 피부.' },
  { value: '중간 피부', label: '중간 피부', description: '보통의 피부색.' },
  { value: '어두운 피부', label: '어두운 피부', description: '짙은 색상의 피부.' },
  { value: '아시아계 피부', label: '아시아계 피부', description: '아시아 인종의 전형적인 피부색.' },
  { value: '유럽계 피부', label: '유럽계 피부', description: '유럽 인종의 전형적인 피부색.' },
  { value: '아프리카계 피부', label: '아프리카계 피부', description: '아프리카 인종의 전형적인 피부색.' },
  { value: '혼혈 피부', label: '혼혈 피부', description: '다양한 인종이 섞인 피부색.' },
];

const hairStyles: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '긴 생머리', label: '긴 생머리', description: '길고 곧은 머리.' },
  { value: '짧은 머리', label: '짧은 머리', description: '짧게 자른 머리.' },
  { value: '곱슬머리', label: '곱슬머리', description: '자연스럽게 말린 머리.' },
  { value: '웨이브', label: '웨이브', description: '파도처럼 구불거리는 머리.' },
  { value: '포니테일', label: '포니테일', description: '하나로 묶은 머리.' },
  { value: '묶은 머리', label: '묶은 머리', description: '다양한 방식으로 묶은 머리.' },
  { value: '삭발', label: '삭발', description: '머리카락을 완전히 밀어버린 스타일.' },
  { value: '대머리', label: '대머리', description: '머리카락이 없는 상태.' },
  { value: '히메컷', label: '히메컷', description: '옆머리를 짧게 자른 일본 전통 스타일.' },
  { value: '레이어드컷', label: '레이어드컷', description: '층을 내어 가볍고 풍성한 머리.' },
];

const bodyTypes: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: '날씬한 체형', label: '날씬한 체형', description: '마른 몸매.' },
  { value: '운동선수 체형', label: '운동선수 체형', description: '근육질의 건강한 몸매.' },
  { value: '보통 체형', label: '보통 체형', description: '표준적인 몸매.' },
  { value: '건장한 체형', label: '건장한 체형', description: '튼튼하고 다부진 몸매.' },
  { value: '통통한 체형', label: '통통한 체형', description: '살집이 있는 몸매.' },
  { value: '근육질 체형', label: '근육질 체형', description: '근육이 강조된 몸매.' },
];

const cameraGearOptions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '선택하지 않습니다.' },
  { value: 'Canon EOS R5', label: 'Canon EOS R5', description: '고해상도 풀프레임 미러리스 카메라.' },
  { value: 'Sony Alpha a7 III', label: 'Sony Alpha a7 III', description: '뛰어난 저조도 성능의 풀프레임 미러리스 카메라.' },
  { value: 'Nikon Z9', label: 'Nikon Z9', description: '전문가를 위한 고속 플래그십 미러리스 카메라.' },
  { value: 'iPhone 15 Pro', label: 'iPhone 15 Pro', description: '최신 아이폰의 고성능 카메라.' },
  { value: 'Samsung Galaxy S24 Ultra', label: 'Samsung Galaxy S24 Ultra', description: '갤럭시 스마트폰의 고급 카메라 시스템.' },
  { value: 'GoPro HERO12 Black', label: 'GoPro HERO12 Black', description: '액션 촬영에 특화된 소형 카메라.' },
  { value: 'DJI Mavic 3 Pro', label: 'DJI Mavic 3 Pro', description: '항공 촬영을 위한 전문가용 드론.' },
  { value: 'Hasselblad X2D 100C', label: 'Hasselblad X2D 100C', description: '중형 포맷의 최고급 카메라.' },
  { value: 'Leica Q2', label: 'Leica Q2', description: '프리미엄 컴팩트 풀프레임 카메라.' },
  { value: 'Fujifilm X-T5', label: 'Fujifilm X-T5', description: '레트로 스타일의 APS-C 미러리스 카메라.' },
  { value: 'Red Komodo 6K', label: 'Red Komodo 6K', description: '영화 제작용 시네마 카메라.' },
];

const filterOptions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함', description: '필터 효과를 사용하지 않습니다.' },
  { value: '빈티지', label: '빈티지', description: '오래된 사진처럼 색이 바랜 느낌.' },
  { value: '세피아', label: '세피아', description: '갈색 톤으로 따뜻하고 향수를 불러일으키는 느낌.' },
  { value: '흑백', label: '흑백', description: '무채색으로 강조된 드라마틱한 효과.' },
  { value: '선명하게', label: '선명하게', description: '색상과 디테일을 강조하여 더욱 또렷하게.' },
  { value: '부드럽게', label: '부드럽게', description: '피부 톤이나 배경을 부드럽게 처리하여 몽환적인 느낌.' },
  { value: '시네마틱', label: '시네마틱', description: '영화의 한 장면처럼 깊이 있고 감성적인 색감.' },
  { value: '레트로', label: '레트로', description: '과거 유행했던 스타일을 모방하여 향수를 자극하는 느낌.' },
  { value: '로우 키', label: '로우 키', description: '어둡고 그림자를 강조하여 신비롭고 극적인 분위기.' },
  { value: '하이 키', label: '하이 키', description: '밝고 환한 톤으로 순수하고 깨끗한 느낌.' },
  { value: '팝 아트', label: '팝 아트', description: '원색과 강렬한 대비를 사용하여 독특하고 생동감 있는 느낌.' },
  { value: '모노크롬', label: '모노크롬', description: '단일 색조의 다양한 명암을 사용하여 차분하고 예술적인 느낌.' },
];

// NEW: Gender, Age Range, Clothing Style, Accessories, Hats, Glasses options
const genderOptions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함' },
  { value: '남성', label: '남성' },
  { value: '여성', label: '여성' },
  { value: '중성', label: '중성' },
];

const ageRangeOptions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함' },
  { value: '유아', label: '유아' },
  { value: '어린이', label: '어린이' },
  { value: '청소년', label: '청소년' },
  { value: '성인', label: '성인' },
  { value: '중년', label: '중년' },
  { value: '노년', label: '노년' },
];

const clothingStyleOptions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함' },
  { value: '캐주얼', label: '캐주얼' },
  { value: '정장', label: '정장' },
  { value: '스포츠웨어', label: '스포츠웨어' },
  { value: '전통의상', label: '전통의상' },
  { value: '미래적', label: '미래적' },
  { value: '고딕', label: '고딕' },
  { value: '펑크', label: '펑크' },
  { value: '빈티지', label: '빈티지' },
  { value: '제복', label: '제복' },
  { value: '아무거나', label: '아무거나' },
];

const accessoriesSelectionOptions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함' },
  { value: '목걸이', label: '목걸이' },
  { value: '귀걸이', label: '귀걸이' },
  { value: '반지', label: '반지' },
  { value: '팔찌', label: '팔찌' },
  { value: '시계', label: '시계' },
  { value: '가방', label: '가방' },
  { value: '스카프', label: '스카프' },
  { value: '넥타이', label: '넥타이' },
  { value: '보석', label: '보석' },
  { value: '벨트', label: '벨트' },
  { value: '아무거나', label: '아무거나' },
];

const hatsOptions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함' },
  { value: '모자', label: '모자' },
  { value: '캡모자', label: '캡모자' },
  { value: '비니', label: '비니' },
  { value: '페도라', label: '페도라' },
  { value: '선캡', label: '선캡' },
  { value: '베레모', label: '베레모' },
  { value: '아무거나', label: '아무거나' },
];

const glassesOptions: DropdownOption[] = [
  { value: '선택 안함', label: '선택 안함' },
  { value: '안경', label: '안경' },
  { value: '선글라스', label: '선글라스' },
  { value: '고글', label: '고글' },
  { value: '아무거나', label: '아무거나' },
];


const PromptBuilder: React.FC<PromptBuilderProps> = ({
  onStructuredPromptChange,
  initialCategory = ['선택 안함'],
  initialStyle = ['선택 안함'],
  initialCharacter = '',
  initialDescription = '',
  initialAngle = ['선택 안함'],
  initialShotType = ['선택 안함'],
  initialLighting = ['선택 안함'],
  initialComposition = ['선택 안함'],
  initialSkinColor = ['선택 안함'],
  initialHairStyle = ['선택 안함'],
  initialGender = ['선택 안함'], // NEW
  initialAgeRange = ['선택 안함'], // NEW
  initialClothingStyle = ['선택 안함'], // NEW
  initialAccessoriesSelection = ['선택 안함'], // NEW
  initialHats = ['선택 안함'], // NEW
  initialGlasses = ['선택 안함'], // NEW
  initialBodyType = ['선택 안함'],
  initialPersonalityTraits = '', // New
  initialBackstory = '', // New
  initialCameraGear = ['선택 안함'], // New
  initialFilter = ['선택 안함'], // New
  initialCharacterReferenceImage = null, // New
  initialCharacterReferenceImageFileName = null, // New prop for file name
  onCharacterReferenceChange, // New param for file name
  disabled,
}) => {
  const [category, setCategory] = useState(initialCategory);
  const [style, setStyle] = useState(initialStyle);
  const [character, setCharacter] = useState(initialCharacter);
  const [description, setDescription] = useState(initialDescription);
  const [angle, setAngle] = useState(initialAngle);
  const [shotType, setShotType] = useState(initialShotType);
  const [lighting, setLighting] = useState(initialLighting);
  const [composition, setComposition] = useState(initialComposition);
  const [skinColor, setSkinColor] = useState(initialSkinColor);
  const [hairStyle, setHairStyle] = useState(initialHairStyle);
  // NEW States
  const [gender, setGender] = useState(initialGender);
  const [ageRange, setAgeRange] = useState(initialAgeRange);
  const [clothingStyle, setClothingStyle] = useState(initialClothingStyle);
  const [accessoriesSelection, setAccessoriesSelection] = useState(initialAccessoriesSelection);
  const [hats, setHats] = useState(initialHats);
  const [glasses, setGlasses] = useState(initialGlasses);
  // END NEW States
  const [bodyType, setBodyType] = useState(initialBodyType);
  const [personalityTraits, setPersonalityTraits] = useState(initialPersonalityTraits); // New
  const [backstory, setBackstory] = useState(initialBackstory); // New
  const [cameraGear, setCameraGear] = useState(initialCameraGear); // New
  const [filter, setFilter] = useState(initialFilter); // New
  const [selectedFileName, setSelectedFileName] = useState(initialCharacterReferenceImageFileName); // New state for file name

  useEffect(() => {
    onStructuredPromptChange({
      category,
      style,
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
      personalityTraits, // New
      backstory, // New
      cameraGear, // New dependency
      filter, // New dependency
    });
  }, [
    category,
    style,
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
    personalityTraits, // New dependency
    backstory, // New dependency
    cameraGear, // New dependency
    filter, // New dependency
    onStructuredPromptChange,
  ]);

  useEffect(() => {
    setSelectedFileName(initialCharacterReferenceImageFileName);
  }, [initialCharacterReferenceImageFileName]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const { data, mimeType } = await fileToBase64(file);
        onCharacterReferenceChange({ data, mimeType }, file.name); // Pass file name
        setSelectedFileName(file.name);
      } catch (error) {
        console.error("파일을 Base64로 변환하는데 실패했습니다:", error);
        alert("이미지 업로드에 실패했습니다. 유효한 이미지 파일을 선택해주세요.");
        onCharacterReferenceChange(null, null); // Clear any partial state
        setSelectedFileName(null);
      }
    } else {
      onCharacterReferenceChange(null, null);
      setSelectedFileName(null);
    }
    // Reset the input value to allow re-uploading the same file if needed
    event.target.value = '';
  };

  const handleRemoveImage = () => {
    onCharacterReferenceChange(null, null);
    setSelectedFileName(null);
  };

  return (
    <div className="space-y-4"> {/* Adjusted spacing for collapsible sections */}
      <CollapsibleSection title="기본 설정" initialOpen={true}>
        <ButtonSelectPanel
          label="카테고리:"
          options={categories}
          selectedValues={category}
          onChange={setCategory}
          disabled={disabled}
        />
        <ButtonSelectPanel
          label="스타일:"
          options={styles}
          selectedValues={style}
          onChange={setStyle}
          disabled={disabled}
        />
        <ButtonSelectPanel // New Filter panel
          label="필터:"
          options={filterOptions}
          selectedValues={filter}
          onChange={setFilter}
          disabled={disabled}
        />
      </CollapsibleSection>

      <CollapsibleSection title="인물 세부 정보" initialOpen={false}>
        <TextInput
          id="character"
          label="주요 인물/객체 (선택 사항):"
          placeholder="예: 마법사, 로봇, 고양이"
          value={character}
          onChange={(e) => setCharacter(e.target.value)}
          disabled={disabled}
          rows={1}
        />
        <ButtonSelectPanel // NEW: Gender
          label="성별:"
          options={genderOptions}
          selectedValues={gender}
          onChange={setGender}
          disabled={disabled}
        />
        <ButtonSelectPanel // NEW: Age Range
          label="연령대:"
          options={ageRangeOptions}
          selectedValues={ageRange}
          onChange={setAgeRange}
          disabled={disabled}
        />
        <TextInput
          id="personalityTraits" // New TextInput
          label="성격/특징 (선택 사항):"
          placeholder="예: 용감하고 결단력 있는, 장난기 많고 호기심 많은"
          value={personalityTraits}
          onChange={(e) => setPersonalityTraits(e.target.value)}
          disabled={disabled}
          rows={1}
        />
        <TextInput
          id="backstory" // New TextInput
          label="배경 스토리 (선택 사항):"
          placeholder="예: 고대 왕국의 마지막 후계자, 버려진 실험실에서 깨어난 인공지능"
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          disabled={disabled}
          rows={2}
        />
        <ButtonSelectPanel
          label="피부색:"
          options={skinColors}
          selectedValues={skinColor}
          onChange={setSkinColor}
          disabled={disabled}
        />
        <ButtonSelectPanel
          label="머리 스타일:"
          options={hairStyles}
          selectedValues={hairStyle}
          onChange={setHairStyle}
          disabled={disabled}
        />
        <ButtonSelectPanel // NEW: Clothing Style
          label="의상:"
          options={clothingStyleOptions}
          selectedValues={clothingStyle}
          onChange={setClothingStyle}
          disabled={disabled}
        />
        <ButtonSelectPanel
          label="체형:"
          options={bodyTypes}
          selectedValues={bodyType}
          onChange={setBodyType}
          disabled={disabled}
        />
        <ButtonSelectPanel // NEW: Accessories Selection
          label="악세서리:"
          options={accessoriesSelectionOptions}
          selectedValues={accessoriesSelection}
          onChange={setAccessoriesSelection}
          disabled={disabled}
        />
        <ButtonSelectPanel // NEW: Hats
          label="모자:"
          options={hatsOptions}
          selectedValues={hats}
          onChange={setHats}
          disabled={disabled}
        />
        <ButtonSelectPanel // NEW: Glasses
          label="안경/고글:"
          options={glassesOptions}
          selectedValues={glasses}
          onChange={setGlasses}
          disabled={disabled}
        />
      </CollapsibleSection>

      <CollapsibleSection title="인물 및 이미지 레퍼런스 (선택 사항)" initialOpen={false}>
        <div className="mb-4">
          <label htmlFor="characterImageUpload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            레퍼런스 이미지 업로드:
          </label>
          <div className="flex items-center space-x-2">
            <label
              htmlFor="characterImageUpload"
              className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm 
                         ${disabled ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'}`}
            >
              Choose File
              <input
                type="file"
                id="characterImageUpload"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={disabled}
                className="sr-only" // Hide the actual input
              />
            </label>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {selectedFileName || 'No file chosen'}
            </span>
          </div>

          {initialCharacterReferenceImage && (
            <div className="mt-4 flex flex-col items-center space-y-2">
              <img
                src={`data:${initialCharacterReferenceImage.mimeType};base64,${initialCharacterReferenceImage.data}`}
                alt="캐릭터 레퍼런스 미리보기"
                className="max-w-48 max-h-48 object-contain rounded-md border border-gray-300 dark:border-gray-600"
              />
              <Button onClick={handleRemoveImage} variant="secondary" size="sm" disabled={disabled}>
                이미지 제거
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="카메라 & 촬영" initialOpen={false}>
        <ButtonSelectPanel
          label="앵글:"
          options={angles}
          selectedValues={angle}
          onChange={setAngle}
          disabled={disabled}
        />
        <ButtonSelectPanel
          label="샷 종류:"
          options={shotTypes}
          selectedValues={shotType}
          onChange={setShotType}
          disabled={disabled}
        />
        <ButtonSelectPanel
          label="조명:"
          options={lightings}
          selectedValues={lighting}
          onChange={setLighting}
          disabled={disabled}
        />
        <ButtonSelectPanel
          label="구도:"
          options={compositions}
          selectedValues={composition}
          onChange={setComposition}
          disabled={disabled}
        />
        <ButtonSelectPanel
          label="장비:"
          options={cameraGearOptions}
          selectedValues={cameraGear}
          onChange={setCameraGear}
          disabled={disabled}
        />
      </CollapsibleSection>

      <CollapsibleSection title="추가 세부 묘사" initialOpen={false}>
        <TextInput
          id="description"
          label="추가 세부 묘사 (선택 사항):"
          placeholder="예: 웅장한 폭포 앞, 신비로운 안개가 자욱한 배경"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled}
          rows={3}
        />
      </CollapsibleSection>
    </div>
  );
};

export default PromptBuilder;