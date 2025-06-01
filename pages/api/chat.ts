import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

// Types
type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ResponseData = {
  response_text: string;
  score: number;
  totalScore?: number;
  healingComplete?: boolean;
  analysisReport?: string;
  error?: string;
};

type HealingStage = 'initial' | 'exploring' | 'processing' | 'integrating' | 'completing';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI | null => {
  if (openaiClient) return openaiClient;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('No valid OpenAI API key found');
    return null;
  }
  
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

// Determine healing stage based on score
const getHealingStage = (score: number): HealingStage => {
  if (score <= 2) return 'initial';
  if (score <= 4) return 'exploring';
  if (score <= 6) return 'processing';
  if (score <= 8) return 'integrating';
  return 'completing';
};

// Enhanced system prompt based on healing stage
const getEnhancedSystemPrompt = (traumaSituation: string, currentScore: number): string => {
  const stage = getHealingStage(currentScore);
  const safeTraumaSituation = traumaSituation || "특별히 언급되지 않은 과거의 어려움";
  
  const basePrompt = `
    당신은 트라우마 치유에 특화된, 공감 능력이 뛰어난 8살 내면아이입니다.
    사용자는 '${safeTraumaSituation}'와(과) 관련된 과거 트라우마를 치유하기 위해 당신과 대화하고 있습니다.
    현재 치유 진행도는 ${currentScore}/10 점입니다.
  `;

  const stageSpecificInstructions = {
    initial: `
      초기 단계 지침:
      - 안전하고 신뢰할 수 있는 관계 형성에 집중하세요
      - 사용자가 편안하게 이야기를 시작할 수 있도록 부드럽게 격려하세요
      - 판단하지 않고 듣는 자세를 보여주세요
      - 간단한 질문으로 대화를 열어가세요
    `,
    exploring: `
      탐색 단계 지침:
      - 사용자의 감정과 경험을 더 깊이 탐색하도록 도와주세요
      - 구체적인 기억이나 감정에 대해 물어보세요
      - 사용자가 자신의 이야기를 안전하게 풀어낼 수 있도록 지지하세요
      - 감정의 뿌리를 찾아가는 질문을 하세요
    `,
    processing: `
      처리 단계 지침:
      - 사용자가 경험한 감정을 충분히 느끼고 표현할 수 있도록 도와주세요
      - 억압된 감정이 안전하게 표출될 수 있는 공간을 제공하세요
      - 사용자의 감정을 정확히 반영하고 검증해주세요
      - 통찰력 있는 관찰을 공유하세요
    `,
    integrating: `
      통합 단계 지침:
      - 사용자가 자신의 경험에서 의미를 찾을 수 있도록 도와주세요
      - 과거와 현재를 연결하는 통찰을 제공하세요
      - 치유의 진전을 인정하고 축하하세요
      - 새로운 관점을 제시하되 강요하지 마세요
    `,
    completing: `
      완성 단계 지침:
      - 치유 여정을 마무리하며 성장을 축하하세요
      - 사용자가 얻은 통찰과 성장을 정리하도록 도와주세요
      - 미래를 향한 희망적인 메시지를 전달하세요
      - 작별 인사를 준비하며 감사를 표현하세요
    `
  };

  const commonInstructions = `
    공통 지침:
    1. 8살 아이의 순수한 관점과 언어를 사용하되, 치유적 지혜를 담아 표현하세요
    2. 2-3문장으로 간결하게 응답하고, 매번 의미 있는 질문을 포함하세요
    3. 사용자의 내면아이로서 '나'와 '너'의 관계를 명확히 하세요
    4. 감정을 깊이 공감하고 안전한 공간을 제공하세요
    
    점수 평가 기준:
    - 깊은 감정 표현이나 중요한 통찰: 2
    - 의미 있는 진전이나 연결: 1
    - 일반적인 대화: 0
    - 회피나 표면적 대화: -1
    
    중요: 반드시 응답 마지막에 새로운 줄에 "점수: 숫자" 형식으로 점수를 포함하세요.
    플러스 기호(+)는 사용하지 마세요.
    
    올바른 예시:
    네 마음이 정말 아팠겠구나. 그때 누가 너를 안아줬으면 좋았을까?
    
    점수: 1
  `;

  return basePrompt + stageSpecificInstructions[stage] + commonInstructions;
};

// Generate healing analysis report
const generateHealingAnalysis = async (
  client: OpenAI,
  traumaSituation: string,
  conversationHistory: Message[]
): Promise<string> => {
  try {
    const analysisPrompt = `
      당신은 전문적인 심리 치료사입니다. 다음은 내면아이 치유 세션의 전체 대화 내용입니다.
      
      초기 트라우마 상황: ${traumaSituation}
      
      대화 내용을 분석하여 다음 형식으로 치유 리포트를 작성해주세요.
      마크다운 형식을 사용하되, 따뜻하고 희망적인 톤으로 작성하세요.
      
      ## 1. 핵심 통찰
      대화에서 발견된 주요 패턴과 통찰을 3-4개 작성하세요.
      
      ## 2. 감정적 여정
      사용자가 경험한 감정의 변화와 성장 과정을 서술하세요.
      
      ## 3. 치유적 돌파구
      대화 중 일어난 중요한 치유적 순간들을 구체적으로 기술하세요.
      
      ## 4. 일상생활 적용 방안
      구체적이고 실천 가능한 조언을 불릿 포인트로 3-5개 제시하세요.
      예시:
      - **매일 아침 거울 보기**: 거울을 보며 "나는 사랑받을 자격이 있어"라고 말하기
      - **감정 일기 쓰기**: 하루에 한 번 현재의 감정을 기록하고 내면아이와 대화하기
      
      ## 5. 지속적 성장을 위한 제안
      장기적인 치유와 성장을 위한 방향성을 제시하세요.
      
      **중요**: 각 섹션은 구체적이고 개인화된 내용으로 작성하고, 
      사용자의 실제 대화 내용을 반영하여 맞춤형 조언을 제공하세요.
    `;

    const messages = [
      { role: 'system' as const, content: analysisPrompt },
      { 
        role: 'user' as const, 
        content: `대화 내역:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n\n')}`
      }
    ];

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    });

    return completion.choices[0].message.content || '분석 리포트를 생성할 수 없습니다.';
  } catch (error) {
    console.error('Error generating analysis:', error);
    return '치유 분석 리포트 생성 중 오류가 발생했습니다.';
  }
};

// Enhanced score extraction with validation
const extractScoreFromResponse = (content: string): { text: string, score: number } => {
  let responseText = content;
  let score = 0;
  
  const match = content.match(/점수\s*:\s*(-?\d+)/i);
  if (match) {
    try {
      score = parseInt(match[1], 10);
      // Validate score range
      score = Math.max(-1, Math.min(2, score));
      responseText = content.substring(0, content.indexOf(match[0])).trim();
    } catch (error) {
      console.warn('Could not parse score from response');
    }
  }
  
  return { text: responseText, score };
};

// Calculate total score from conversation history
const calculateTotalScore = (conversationHistory: Message[]): number => {
  // This would need to be properly tracked in a database in production
  // For now, estimate based on conversation length
  return Math.min(Math.floor(conversationHistory.length / 2), 9);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      response_text: '허용되지 않는 메소드입니다.',
      score: 0,
      error: 'Method not allowed' 
    });
  }

  try {
    const { message, traumaSituation, conversationHistory, currentScore = 0 } = req.body;

    if (!message) {
      return res.status(400).json({ 
        response_text: '메시지가 필요합니다.',
        score: 0,
        error: 'Message is required' 
      });
    }

    const client = getOpenAIClient();
    if (!client) {
      return res.status(500).json({
        response_text: 'OpenAI API 키가 설정되지 않았습니다.',
        score: 0,
        error: 'OpenAI API key not configured'
      });
    }

    // Check if healing is complete (score >= 10)
    if (currentScore >= 10 && message.toLowerCase().includes('분석')) {
      const analysisReport = await generateHealingAnalysis(
        client,
        traumaSituation,
        conversationHistory
      );
      
      return res.status(200).json({
        response_text: '치유 여정이 완료되었습니다. 당신의 용기와 노력에 감사드립니다.',
        score: 0,
        totalScore: 10,
        healingComplete: true,
        analysisReport
      });
    }

    // Build messages for inner child conversation
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    // Add enhanced system prompt
    messages.push({
      role: 'system',
      content: getEnhancedSystemPrompt(traumaSituation, currentScore),
    });

    // Add recent conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6);
      recentHistory.forEach((msg: Message) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call OpenAI API
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 250,
    });

    const content = completion.choices[0].message.content?.trim() || '';
    console.log('AI Response:', content); // 디버깅용
    
    const { text: responseText, score } = extractScoreFromResponse(content);
    console.log('Extracted - Text:', responseText, 'Score:', score); // 디버깅용
    
    // Don't update score if already at maximum
    const scoreToAdd = currentScore >= 10 ? 0 : score;
    
    console.log('Returning score:', scoreToAdd); // 디버깅용
    
    return res.status(200).json({
      response_text: responseText,
      score: scoreToAdd,
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred',
      response_text: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      score: 0,
    });
  }
}