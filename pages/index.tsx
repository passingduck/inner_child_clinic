import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const [traumaText, setTraumaText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Memoize the trauma text to prevent unnecessary re-renders
  const memoizedTraumaText = useMemo(() => traumaText, [traumaText]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memoizedTraumaText.trim()) {
      setError('트라우마 상황을 설명해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Store the trauma text in localStorage for the chat page
      localStorage.setItem('traumaText', memoizedTraumaText);
      
      // Redirect to the chat page
      router.push('/chat');
    } catch (error) {
      console.error('Error:', error);
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  }, [memoizedTraumaText, router]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTraumaText(e.target.value);
    if (error) setError('');
  }, [error]);

  return (
    <>
      <Head>
        <title>내면아이 클리닉 - 치유의 시작</title>
        <meta name="description" content="내면아이 치유를 위한 대화형 서비스" />
      </Head>
      <div className="container">
        <header>
          <h1>내면아이 치유 클리닉</h1>
          <p className="subtitle">당신의 내면아이를 만나고 치유의 여정을 시작하세요</p>
        </header>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="trauma">
                <span className="label-text">트라우마 상황 설명</span>
                <span className="label-description">치유하고 싶은 과거의 상처나 트라우마 상황을 자유롭게 설명해주세요. 이 내용은 내면아이와의 대화에 활용됩니다.</span>
              </label>
              <textarea 
                id="trauma" 
                value={traumaText}
                onChange={handleTextChange}
                rows={4} 
                placeholder="예: 어린 시절 부모님의 이혼, 학교에서의 따돌림 경험, 자존감 상실 등" 
                required
              />
            </div>
            <div className="form-actions">
              <button 
                type="submit" 
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리 중...' : '내면아이 만나기'}
              </button>
            </div>
          </form>
        </div>

        <footer>
          <p>내면아이 치유 클리닉은 당신의 과거 트라우마를 치유하고 자기 자신을 이해하는 여정을 돕습니다.</p>
          <p>이 서비스는 전문적인 심리 상담을 대체하지 않습니다. 심각한 정신 건강 문제가 있다면 전문가와 상담하세요.</p>
        </footer>
      </div>
    </>
  );
}
