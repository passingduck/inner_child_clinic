import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Head from 'next/head';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [traumaText, setTraumaText] = useState('');
  const [currentScore, setCurrentScore] = useState(0);
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

    // Get initial greeting from the AI
    getInitialGreeting(storedTraumaText);
  }, [router]);

  useEffect(() => {
    // Scroll to the bottom of the dialogue box when new messages are added
    if (dialogueBoxRef.current) {
      dialogueBoxRef.current.scrollTop = dialogueBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Memoize the trauma text to prevent unnecessary re-renders
  const memoizedTraumaText = useMemo(() => traumaText, [traumaText]);
  
  // Use useCallback for functions to prevent unnecessary re-renders
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
      setCurrentScore((prev) => Math.min(10, Math.max(0, prev + data.score)));
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
    
    // Add user message to the chat
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add AI response to the chat
      setMessages([
        ...updatedMessages,
        { role: 'assistant' as const, content: data.response_text },
      ]);
      
      // Update score
      const newScore = currentScore + data.score;
      setCurrentScore(Math.min(10, Math.max(0, newScore)));
      
      // Check if healing is complete
      if (newScore >= 10) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'system' as const,
            content: '축하합니다! 내면아이의 마음이 충분히 치유되었습니다. 치유 과정이 완료되었습니다.',
          },
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...updatedMessages,
        {
          role: 'system' as const,
          content: '메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, traumaText, currentScore]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const resetConversation = useCallback(() => {
    if (window.confirm('대화를 초기화하시겠습니까? 모든 대화 내용이 사라집니다.')) {
      localStorage.removeItem('traumaText');
      router.push('/');
    }
  }, [router]);

  // Memoize the messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);
  
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
          <span>치유 진행도</span>
          <span id="gaugeValue">{currentScore}/10</span>
        </div>
        <div className="gauge-wrapper">
          <progress value={currentScore} max={10}></progress>
        </div>
        <div className="gauge-description">
          <span>대화를 통해 치유 게이지가 채워집니다. 10에 도달하면 치유가 완료됩니다.</span>
        </div>
      </div>

      <div className="chat-section">
        <div ref={dialogueBoxRef} className="dialogue-box">
          {memoizedMessages.map((message, index) => (
            <div key={index} className={`message ${message.role}-message`}>
              <div className="message-content">
                <div className="message-sender">
                  {message.role === 'user' ? '나' : message.role === 'assistant' ? '아이' : '시스템'}
                </div>
                <div className="message-text">{message.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message child-message typing-indicator">
              <div className="message-content">
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
            placeholder="내면아이에게 말을 걸어보세요..."
            rows={3}
            disabled={isLoading || currentScore >= 10}
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
              disabled={isLoading || !input.trim() || currentScore >= 10}
            >
              <span>전송</span>
            </button>
          </div>
        </div>
      </div>

      <div className="guidance-section">
        <h3>대화 가이드</h3>
        <ul>
          <li><strong>진실된 감정 표현:</strong> 당신의 진짜 감정과 생각을 솔직하게 표현해보세요.</li>
          <li><strong>과거 경험 공유:</strong> 어린 시절 경험했던 상처나 감정을 내면아이와 나눠보세요.</li>
          <li><strong>질문하기:</strong> 내면아이에게 궁금한 점을 물어보세요. 당신의 어린 시절 관점을 들을 수 있습니다.</li>
          <li><strong>위로와 인정:</strong> 내면아이의 감정을 인정하고 위로해주세요.</li>
        </ul>
      </div>

      <footer>
        <Link href="/" className="text-link">처음으로 돌아가기</Link>
        <p>내면아이 치유 클리닉 &copy; 2025</p>
      </footer>
    </div>
    </>
  );
}
