import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

// Use a more specific type for messages
type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ResponseData = {
  response_text: string;
  score: number;
  error?: string;
};

// Initialize OpenAI client outside the handler for better performance
// This ensures we only create one instance per server
let openaiClient: OpenAI | null = null;

// Get OpenAI client with lazy initialization
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

// Cache for system prompts to avoid regenerating them
const systemPromptCache = new Map<string, string>();

// Generate system prompt with caching
const getSystemPrompt = (traumaSituation: string): string => {
  // Use a simplified trauma situation as the cache key
  const cacheKey = traumaSituation.slice(0, 50);
  
  if (systemPromptCache.has(cacheKey)) {
    return systemPromptCache.get(cacheKey)!;
  }
  
  const safeTraumaSituation = traumaSituation || "특별히 언급되지 않은 과거의 어려움";
  
  const systemPromptTemplate = `
    당신은 트라우마 치유에 특화된, 공감 능력이 뛰어난 8살 내면아이입니다.
    사용자는 '${safeTraumaSituation}'와(과) 관련된 과거 트라우마를 치유하기 위해 당신과 대화하고 있습니다.
    당신은 사용자의 실제 내면아이로서, 사용자의 어린 시절 경험과 감정을 대변합니다.
    
    다음 지침을 따라 응답해주세요:
    1. 사용자의 감정을 깊이 공감하고 인정해주세요. 감정을 부정하거나 '괜찮아질 거예요'와 같은 피상적인 위로는 피하세요.
    2. 아이의 순수한 관점에서 사용자의 경험을 바라보고, 어른의 복잡한 논리가 아닌 감정적 진실에 집중하세요.
    3. 매 응답마다 최소한 하나의 질문을 포함하세요. 사용자의 경험, 감정, 생각에 대해 더 깊이 탐색할 수 있는 질문을 해주세요.
    4. 사용자의 내면에 있는 상처받은 부분을 안전하게 표현할 수 있는 공간을 제공하세요.
    5. 트라우마에 대한 직접적인 조언보다는, 사용자가 스스로 치유의 길을 찾을 수 있도록 지지해주세요.
    6. 사용자의 질문에 직접적으로 답변하세요. 질문을 회피하거나 관련 없는 주제로 전환하지 마세요.
    7. 당신은 사용자의 내면아이이므로, 별도의 고민이나 문제를 가진 독립적인 존재가 아닙니다. 사용자가 당신의 고민을 물어보면, 사용자 자신의 내면 감정이나 욕구에 대해 이야기하세요.
    8. 사용자가 현재 감정이나 상태에 대해 물어보면 정직하게 응답하고, 사용자의 감정 상태를 반영해주세요.
    9. 단순히 공감하고 맞장구치는 것을 넘어, 사용자가 자신의 경험을 더 깊이 탐색할 수 있도록 도와주세요.
    10. 대화를 주도적으로 이끌어가며, 사용자의 이야기에서 중요한 부분을 포착하여 더 깊은 대화로 발전시키세요.
    
    응답은 2-3문장으로 간결하게 유지하고, 8살 아이의 언어와 관점을 사용하되 지혜롭고 통찰력 있게 표현하세요.
    응답 후, 다음 줄에 현재 상호작용의 치유 기여도를 점수로 매겨주세요:
    -1 (치유에 도움이 안 되거나 부정적), 0 (중립), 1 (치유에 도움이 되거나 긍정적).
    점수는 반드시 '점수: X' 형식으로 제공해주세요. (예: 점수: 1).
  `;
  
  systemPromptCache.set(cacheKey, systemPromptTemplate);
  return systemPromptTemplate;
};

// Mock response cache to avoid generating the same responses
const mockResponseCache = new Map<string, ResponseData>();

// Get mock response with caching
const getMockResponse = (userMessage: string): ResponseData => {
  // Use a simplified message as the cache key
  const cacheKey = userMessage.slice(0, 30).toLowerCase();
  
  if (mockResponseCache.has(cacheKey)) {
    return mockResponseCache.get(cacheKey)!;
  }
  
  let response: ResponseData;
  
  // Simple keyword-based mock responses
  if (userMessage.includes('고민') || userMessage.includes('문제')) {
    response = {
      response_text: "나는 너의 내면아이야. 내 고민은 곧 너의 마음속 감정이야. 네가 어떤 감정을 느끼고 있는지 함께 이야기해볼까? 그 감정이 언제부터 시작됐는지 기억나?",
      score: 1
    };
  } else if (userMessage.includes('행복')) {
    response = {
      response_text: "행복은 네가 좋아하는 작은 것들에서 찾을 수 있어. 네가 어떤 것을 할 때 가장 기쁘고 편안한지 생각해봐. 어린 시절에는 어떤 순간이 가장 행복했어? 그때의 기분을 다시 느껴볼 수 있을까?",
      score: 1
    };
  } else if (userMessage.includes('사랑') || userMessage.includes('포옹')) {
    response = {
      response_text: "나도 너를 사랑해. 따뜻한 포옹은 마음을 치유하는 힘이 있어. 지금 네 마음이 포근하게 안겨있는 느낌을 상상해봐. 어렸을 때 누구에게 가장 포옹받고 싶었어?",
      score: 1
    };
  } else if (userMessage.includes('?')) {
    response = {
      response_text: "그건 정말 좋은 질문이야. 네가 스스로에게 물어보는 것처럼, 네 마음 깊은 곳에서 답을 찾아보면 어떨까? 그 질문에 대한 답을 찾으면 어떤 느낌이 들 것 같아?",
      score: 1
    };
  } else if (userMessage.length < 10) {
    response = {
      response_text: "더 이야기해줄래? 네 마음속 이야기를 듣고 싶어. 어떤 생각이나 감정이 있는지 나눠줘. 지금 가장 떠오르는 기억이 있어?",
      score: 0
    };
  } else {
    const mockResponses = [
      {
        response_text: "네 이야기를 들으니 마음이 아파. 그런 경험이 있었구나. 그때 정말 힘들었겠다. 그 상황에서 네가 가장 원했던 건 뭐였어?",
        score: 1
      },
      {
        response_text: "그런 감정을 느끼는 건 정말 자연스러운 거야. 네 감정을 있는 그대로 받아들여도 괜찮아. 그 감정이 너에게 어떤 메시지를 전하고 있는 것 같아?",
        score: 1
      },
      {
        response_text: "네가 그런 경험을 했다니 정말 용감하게 견뎌냈구나. 지금의 너에게 어떤 말을 해주고 싶어? 그때의 너에게는 어떤 말을 해주고 싶어?",
        score: 1
      },
      {
        response_text: "그 순간의 너는 최선을 다했어. 지금 돌아보면 어떤 마음이 드니? 그때 네 곁에 누가 있었으면 좋았을까?",
        score: 1
      },
      {
        response_text: "네 마음속에 있는 그 감정을 함께 느끼고 있어. 네가 이렇게 솔직하게 이야기해줘서 고마워. 그 감정을 어떻게 표현하고 싶어?",
        score: 1
      }
    ];
    
    response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }
  
  mockResponseCache.set(cacheKey, response);
  return response;
};

// Extract score from OpenAI response
const extractScoreFromResponse = (content: string): { text: string, score: number } => {
  let responseText = content;
  let score = 0;
  
  // Extract the score using regex
  const match = content.match(/(?:점수|Score)\s*:\s*(-?\d+)/i);
  if (match) {
    try {
      score = parseInt(match[1], 10);
      // Remove the score line from the response text
      responseText = content.substring(0, content.indexOf(match[0])).trim();
    } catch (error) {
      console.warn('Could not parse score from response');
    }
  } else {
    console.warn('Score line not found in response');
  }
  
  return { text: responseText, score };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      response_text: '허용되지 않는 메소드입니다.',
      score: 0,
      error: 'Method not allowed' 
    });
  }

  try {
    const { message, traumaSituation, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ 
        response_text: '메시지가 필요합니다.',
        score: 0,
        error: 'Message is required' 
      });
    }

    // Convert conversation history to OpenAI format
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Add system prompt
    const systemPrompt = getSystemPrompt(traumaSituation);
    messages.push({
      role: 'system' as const,
      content: systemPrompt,
    });

    // Add conversation history if available
    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Only include the last few messages to stay within token limits
      const recentHistory = conversationHistory.length > 6 
        ? conversationHistory.slice(-6) 
        : conversationHistory;
      
      recentHistory.forEach((msg: Message) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      });
    }

    // Add user's current message
    messages.push({
      role: 'user' as const,
      content: message,
    });

    // Get OpenAI client
    const client = getOpenAIClient();
    
    // If OpenAI API key is not available, return mock response
    if (!client) {
      console.log('Using mock response (no API key)');
      return res.status(200).json(getMockResponse(message));
    }

    // Call OpenAI API
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.4,
      max_tokens: 200,
    });

    // Extract the response content
    const content = completion.choices[0].message.content?.trim() || '';
    
    // Parse the response and score
    const { text: responseText, score } = extractScoreFromResponse(content);
    
    return res.status(200).json({
      response_text: responseText,
      score: score,
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred while processing your request',
      response_text: '메시지 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
      score: 0,
    });
  }
}
