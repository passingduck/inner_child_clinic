import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type HealingStage = {
  name: string;
  description: string;
  minScore: number;
};

const healingStages: HealingStage[] = [
  { name: '신뢰 형성', description: '안전한 관계를 만들어가는 단계', minScore: 0 },
  { name: '감정 탐색', description: '내면의 감정을 탐험하는 단계', minScore: 3 },
  { name: '감정 처리', description: '억압된 감정을 표현하는 단계', minScore: 5 },
  { name: '통합', description: '새로운 통찰을 얻는 단계', minScore: 7 },
  { name: '완성', description: '치유를 마무리하는 단계', minScore: 9 },
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [traumaText, setTraumaText] = useState('');
  const [currentScore, setCurrentScore] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisReport, setAnalysisReport] = useState('');
  const [healingComplete, setHealingComplete] = useState(false);
  const dialogueBoxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if we have trauma text in localStorage
    const storedTraumaText = localStorage.getItem('traumaText');
    if (!storedTraumaText) {
      // Redirect back to the home page if no trauma text is found
      router.push('/');
      return;
    }

    setTraumaText(storedTraumaText);

    // Get stored score
    const storedScore = localStorage.getItem('healingScore');
    if (storedScore) {
      setCurrentScore(parseInt(storedScore, 10));
    }

    // Get initial greeting from the AI
    getInitialGreeting(storedTraumaText);
  }, [router]);

  useEffect(() => {
    if (dialogueBoxRef.current) {
      dialogueBoxRef.current.scrollTop = dialogueBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Save score to localStorage
    localStorage.setItem('healingScore', currentScore.toString());
  }, [currentScore]);

  const getCurrentStage = useCallback(() => {
    return healingStages.findLast(stage => currentScore >= stage.minScore) || healingStages[0];
  }, [currentScore]);

  const getInitialGreeting = useCallback(async (trauma: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '안녕, 만나서 반가워. 오늘 어떤 이야기를 나누고 싶어?',
          traumaSituation: trauma,
          conversationHistory: [],
          currentScore: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get initial greeting');
      }

      const data = await response.json();
      
      setMessages([
        {
          role: 'assistant' as const,
          content: data.response_text,
        },
      ]);
      
      // Update score
      if (data.score !== undefined) {
        setCurrentScore((prev) => Math.min(10, Math.max(0, prev + data.score)));
      }
    } catch (error) {
      console.error('Error getting initial greeting:', error);
      setMessages([
        {
          role: 'system' as const,
          content: '연결 중 오류가 발생했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Handle analysis request
    if (healingComplete && userMessage.toLowerCase().includes('분석')) {
      setShowAnalysis(true);
      return;
    }
    
    const updatedMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(updatedMessages);
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          traumaSituation: traumaText,
          conversationHistory: updatedMessages,
          currentScore,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      console.log('API Response:', data); // 디버깅용 로그
      
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: data.response_text },
      ]);
      
      // Update score
      if (data.score !== undefined && data.score !== null) {
        console.log('Current score:', currentScore, 'Adding:', data.score); // 디버깅용 로그
        const newScore = Math.min(10, Math.max(0, currentScore + data.score));
        console.log('New score:', newScore); // 디버깅용 로그
        setCurrentScore(newScore);
        
        // Check if healing is complete
        if (newScore >= 10 && currentScore < 10) {
          setHealingComplete(true);
          setMessages((prev) => [
            ...prev,
            {
              role: 'system' as const,
              content: '축하합니다! 내면아이의 마음이 충분히 치유되었습니다. "분석 보기" 버튼을 클릭하여 치유 여정을 분석해보세요.',
            },
          ]);
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...updatedMessages,
        {
          role: 'system',
          content: '메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, traumaText, currentScore, healingComplete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const resetConversation = useCallback(() => {
    if (window.confirm('대화를 초기화하시겠습니까? 모든 대화 내용과 진행도가 사라집니다.')) {
      localStorage.removeItem('traumaText');
      localStorage.removeItem('healingScore');
      router.push('/');
    }
  }, [router]);

  // Simple markdown to HTML converter
  const renderMarkdown = (text: string) => {
    // First, handle bold text to prevent it from being applied to entire paragraphs
    const processBoldText = (str: string) => {
      const parts = str.split(/\*\*([^*]+)\*\*/g);
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={`bold-${index}`}>{part}</strong>;
        }
        return part;
      });
    };

    // Split by newlines to process line by line
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line - close any open list
        if (currentList.length > 0) {
          if (listType === 'ol') {
            elements.push(<ol key={`list-${i}`} style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{currentList}</ol>);
          } else {
            elements.push(<ul key={`list-${i}`} style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{currentList}</ul>);
          }
          currentList = [];
          listType = null;
        }
        continue;
      }

      // Check for headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} style={{ marginTop: '1.5rem', marginBottom: '0.8rem', color: '#4a6a8c', fontSize: '1.2rem' }}>
            {processBoldText(line.substring(4))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} style={{ marginTop: '2rem', marginBottom: '1rem', color: '#4a6a8c', fontSize: '1.5rem' }}>
            {processBoldText(line.substring(3))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} style={{ marginTop: '2rem', marginBottom: '1rem', color: '#4a6a8c', fontSize: '1.8rem' }}>
            {processBoldText(line.substring(2))}
          </h1>
        );
      } 
      // Check for list items
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.substring(2);
        currentList.push(
          <li key={`li-${i}`} style={{ marginBottom: '0.5rem', lineHeight: '1.8' }}>
            {processBoldText(content)}
          </li>
        );
        listType = 'ul';
      } else if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '');
        currentList.push(
          <li key={`li-${i}`} style={{ marginBottom: '0.5rem', lineHeight: '1.8' }}>
            {processBoldText(content)}
          </li>
        );
        listType = 'ol';
      } 
      // Regular paragraph
      else {
        // Close any open list
        if (currentList.length > 0) {
          if (listType === 'ol') {
            elements.push(<ol key={`list-${i}`} style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{currentList}</ol>);
          } else {
            elements.push(<ul key={`list-${i}`} style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{currentList}</ul>);
          }
          currentList = [];
          listType = null;
        }
        
        elements.push(
          <p key={`p-${i}`} style={{ marginBottom: '1rem', lineHeight: '1.8', fontSize: '1rem' }}>
            {processBoldText(line)}
          </p>
        );
      }
    }

    // Close any remaining list
    if (currentList.length > 0) {
      if (listType === 'ol') {
        elements.push(<ol key="list-final" style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{currentList}</ol>);
      } else {
        elements.push(<ul key="list-final" style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{currentList}</ul>);
      }
    }

    return elements;
  };

  const requestAnalysis = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '분석',
          traumaSituation: traumaText,
          conversationHistory: messages,
          currentScore: 10,
        }),
      });

      const data = await response.json();
      if (data.analysisReport) {
        setAnalysisReport(data.analysisReport);
        setShowAnalysis(true);
      }
    } catch (error) {
      console.error('Error requesting analysis:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, traumaText]);

  const currentStage = getCurrentStage();
  
  return (
    <>
      <Head>
        <title>내면아이와 대화하기 | 내면아이 클리닉</title>
        <meta name="description" content="내면아이와 대화하며 치유의 시간을 가져보세요" />
      </Head>
      <div className="container">
        <header>
          <h1>내면아이와 대화하기</h1>
          <p className="subtitle">당신의 내면아이와 대화하며 치유의 시간을 가져보세요</p>
        </header>

        <div className="healing-gauge">
          <div className="gauge-label">
            <span>치유 진행도: {currentStage.name}</span>
            <span id="gaugeValue">{currentScore}/10</span>
          </div>
          <div className="gauge-wrapper">
            <progress value={currentScore} max={10}></progress>
          </div>
          <div className="gauge-description">
            <span>{currentStage.description}</span>
          </div>
          {healingComplete && (
            <div className="healing-complete-notice">
              <span>🎉 치유 과정이 완료되었습니다!</span>
              <button onClick={requestAnalysis} className="analysis-button">
                치유 분석 보기
              </button>
            </div>
          )}
        </div>

        {showAnalysis && analysisReport && (
          <div className="analysis-modal">
            <div className="analysis-content">
              <h2>치유 여정 분석 리포트</h2>
              <div className="analysis-report">
                {renderMarkdown(analysisReport)}
              </div>
              <button onClick={() => setShowAnalysis(false)} className="close-button">
                닫기
              </button>
            </div>
          </div>
        )}

        <div className="chat-section">
          <div ref={dialogueBoxRef} className="dialogue-box">
            {messages.map((message, index) => (
              <div key={`message-${index}`} className={`message ${message.role}-message`}>
                <div className="message-content">
                  <div className="message-sender">
                    {message.role === 'user' ? '나' : message.role === 'assistant' ? '내면아이' : '시스템'}
                  </div>
                  <div className="message-text">{message.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant-message typing-indicator">
                <div className="message-content">
                  <div className="message-sender">내면아이</div>
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="user-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={healingComplete ? "치유가 완료되었습니다. '분석 보기'를 클릭하세요." : "내면아이에게 말을 걸어보세요..."}
              rows={3}
              disabled={isLoading}
            />
            <div className="input-actions">
              <button
                onClick={resetConversation}
                className="secondary-button"
                title="대화 초기화"
              >
                <i className="fa fa-redo-alt"></i> 초기화
              </button>
              <button
                onClick={sendMessage}
                className="primary-button"
                disabled={isLoading || !input.trim()}
              >
                <span>전송</span>
              </button>
            </div>
          </div>
        </div>

        <div className="guidance-section">
          <h3>현재 단계: {currentStage.name}</h3>
          <div className="stage-tips">
            {currentStage.name === '신뢰 형성' && (
              <ul>
                <li>편안하게 자신을 소개해보세요</li>
                <li>내면아이와 친해지는 시간을 가져보세요</li>
                <li>판단 없이 솔직한 마음을 표현해보세요</li>
              </ul>
            )}
            {currentStage.name === '감정 탐색' && (
              <ul>
                <li>어린 시절의 기억을 떠올려보세요</li>
                <li>그때 느꼈던 감정을 구체적으로 표현해보세요</li>
                <li>내면아이의 질문에 진솔하게 답해보세요</li>
              </ul>
            )}
            {currentStage.name === '감정 처리' && (
              <ul>
                <li>억눌렀던 감정을 자유롭게 표현해보세요</li>
                <li>슬픔, 분노, 두려움도 괜찮습니다</li>
                <li>내면아이와 함께 감정을 충분히 느껴보세요</li>
              </ul>
            )}
            {currentStage.name === '통합' && (
              <ul>
                <li>새로운 관점으로 과거를 바라보세요</li>
                <li>얻은 통찰을 정리해보세요</li>
                <li>성장한 자신을 인정해주세요</li>
              </ul>
            )}
            {currentStage.name === '완성' && (
              <ul>
                <li>치유의 여정을 마무리해보세요</li>
                <li>내면아이에게 감사를 전해보세요</li>
                <li>미래를 향한 희망을 나눠보세요</li>
              </ul>
            )}
          </div>
        </div>

        <footer>
          <Link href="/" className="text-link">처음으로 돌아가기</Link>
          <p>내면아이 치유 클리닉 &copy; 2025</p>
        </footer>
      </div>

      <style jsx>{`
        .healing-complete-notice {
          margin-top: 1rem;
          text-align: center;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          color: white;
        }

        .analysis-button {
          margin-top: 0.5rem;
          padding: 0.5rem 1rem;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .analysis-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .analysis-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          margin: 1rem;
        }

        .analysis-content h2 {
          color: #667eea;
          margin-bottom: 1.5rem;
          text-align: center;
          font-size: 1.8rem;
        }

        .analysis-report {
          line-height: 1.8;
          color: #333;
          font-size: 1rem;
        }

        .analysis-report p {
          margin-bottom: 1rem;
        }

        .analysis-report h1, 
        .analysis-report h2, 
        .analysis-report h3 {
          font-weight: 600;
          color: #4a6a8c;
        }

        .analysis-report h1 {
          font-size: 1.8rem;
        }

        .analysis-report h2 {
          font-size: 1.5rem;
        }

        .analysis-report h3 {
          font-size: 1.2rem;
        }

        .analysis-report ul,
        .analysis-report ol {
          margin-bottom: 1rem;
          padding-left: 2rem;
        }

        .analysis-report li {
          margin-bottom: 0.5rem;
          line-height: 1.8;
        }

        .analysis-report strong {
          font-weight: 600;
          color: #2d3748;
        }

        .close-button {
          margin-top: 2rem;
          padding: 0.75rem 2rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }

        .stage-tips {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .stage-tips ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .stage-tips li {
          margin-bottom: 0.5rem;
          color: #555;
        }

        .dialogue-box {
          height: 400px;
          overflow-y: auto;
          padding: 1.5rem;
          background: #f8f9fa;
        }

        .message {
          margin-bottom: 1rem;
          opacity: 1;
          animation: fadeIn 0.3s ease-in;
          animation-fill-mode: forwards;
        }

        .message-content {
          padding: 1rem;
          border-radius: 8px;
          max-width: 80%;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .assistant-message .message-content {
          margin-right: auto;
          background: #e6f2ff;
          border: 1px solid #b3d9ff;
        }

        .user-message .message-content {
          margin-left: auto;
          background: #f0f0f0;
          border: 1px solid #d0d0d0;
        }

        .system-message .message-content {
          margin: 0 auto;
          background: #fff3cd;
          border: 1px solid #ffc107;
          text-align: center;
          max-width: 90%;
        }

        .message-sender {
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #666;
        }

        .message-text {
          color: #333;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        progress {
          width: 100%;
          height: 20px;
          -webkit-appearance: none;
          appearance: none;
        }

        progress::-webkit-progress-bar {
          background-color: #e0e0e0;
          border-radius: 10px;
        }

        progress::-webkit-progress-value {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          transition: width 0.5s ease;
        }

        .typing-dots {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .typing-dots span {
          display: inline-block;
          width: 8px;
          height: 8px;
          background-color: #667eea;
          border-radius: 50%;
          margin: 0 2px;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}