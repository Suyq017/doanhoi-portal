Read [](file:///d%3A/hcmut/internship/doanhoi-portal/backend/src/ctxh-chat/services/ctxh-chat.service.ts#1-1), lines 1 to 100

Read [](file:///d%3A/hcmut/internship/doanhoi-portal/backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts#1-1), lines 1 to 150

Read [](file:///d%3A/hcmut/internship/doanhoi-portal/backend/src/ctxh-chat/dto/chat-request.dto.ts)

Read [](file:///d%3A/hcmut/internship/doanhoi-portal/backend/src/ctxh-chat/dto/chat-response.dto.ts)

Searched for regex `@Post|@Get|@Delete` (`**/backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts`), 15 results

Perfect! Tôi đã kiểm tra source code. Hệ thống của bạn có cấu trúc rất rõ ràng với các API endpoints chuẩn REST. Bây giờ tôi sẽ hướng dẫn bạn setup **Black-box Testing với Python + Ragas/DeepEval**.

---

## **📋 PHÂN TÍCH HỆ THỐNG HIỆN TẠI**

### **API Endpoints cần test:**
```
✅ POST /api/ctxh-chat/message         → Core RAG endpoint
✅ GET  /api/ctxh-chat/history/:id     → Conversation history
✅ DELETE /api/ctxh-chat/session/:id   → Clear session
✅ POST /api/ctxh-chat/feedback        → User feedback
✅ GET  /api/ctxh-chat/health          → Health check
```

### **Response Structure hiện tại:**
```typescript
{
  sessionId: string,
  response: string,              // LLM generated answer
  sources: [                     // Retrieved documents
    {
      activityId: string,
      activityName: string,
      organizationName: string,
      similarityScore: number,   // 0-1
      link?: string
    }
  ],
  responseTime: number,          // milliseconds
  timestamp: Date,
  followUpSuggestions?: string[],
  confidence?: number            // 0-100
}
```

---

## **🎯 CHIẾN LƯỢC TESTING BLACK-BOX**

### **1. Cấu trúc thư mục đề xuất:**

```
doanhoi-portal/
├── backend/                    # NestJS (System Under Test)
├── frontend/
└── testing/                    # ← TẠO MỚI
    ├── requirements.txt
    ├── .env.test
    ├── pytest.ini
    ├── conftest.py
    ├── datasets/
    │   ├── test_queries.json
    │   ├── ground_truth.json
    │   └── golden_dataset.csv
    ├── tests/
    │   ├── test_rag_pipeline.py
    │   ├── test_retrieval_quality.py
    │   ├── test_generation_quality.py
    │   └── test_performance.py
    ├── utils/
    │   ├── api_client.py
    │   └── metrics.py
    └── reports/
        └── evaluation_results.html
```

---

## **⚙️ SETUP PYTHON TESTING ENVIRONMENT**

### **Step 1: Tạo requirements.txt**
```txt
# Core Testing Frameworks
ragas==0.1.7
deepeval==0.21.38
pytest==7.4.3
pytest-asyncio==0.21.1

# API Testing
requests==2.31.0
httpx==0.25.2

# Data Processing
pandas==2.1.4
numpy==1.26.2

# LLM/Embeddings (for evaluation)
openai==1.6.1
google-generativeai==0.3.2

# Reporting
jinja2==3.1.2
plotly==5.18.0

# Environment
python-dotenv==1.0.0
```

### **Step 2: Tạo .env.test**
```bash
# NestJS Backend
BACKEND_URL=http://localhost:9200
API_PREFIX=/api/ctxh-chat

# Authentication (nếu cần JWT)
TEST_USER_EMAIL=test@hcmut.edu.vn
TEST_USER_PASSWORD=test123

# Evaluation LLM (cho Ragas/DeepEval)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key  # Optional

# Test Configuration
MAX_RETRIES=3
TIMEOUT_SECONDS=30
```

---

## **🔧 IMPLEMENTATION: Black-box Testing Code**

### **File 1: `utils/api_client.py`** (API Wrapper)

```python
import os
import requests
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv('.env.test')

class CTXHChatClient:
    """Black-box API client for NestJS backend"""
    
    def __init__(self):
        self.base_url = os.getenv('BACKEND_URL')
        self.api_prefix = os.getenv('API_PREFIX')
        self.timeout = int(os.getenv('TIMEOUT_SECONDS', 30))
        self.access_token = None
    
    def login(self) -> str:
        """Authenticate and get JWT token"""
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={
                "email": os.getenv('TEST_USER_EMAIL'),
                "password": os.getenv('TEST_USER_PASSWORD')
            },
            timeout=self.timeout
        )
        response.raise_for_status()
        self.access_token = response.json()['accessToken']
        return self.access_token
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with JWT token"""
        if not self.access_token:
            self.login()
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def send_message(
        self, 
        message: str, 
        session_id: Optional[str] = None
    ) -> Dict:
        """
        Send message to RAG chatbot
        
        Returns:
            {
                'sessionId': str,
                'response': str,
                'sources': List[Dict],
                'responseTime': int,
                'confidence': float
            }
        """
        url = f"{self.base_url}{self.api_prefix}/message"
        payload = {'message': message}
        
        if session_id:
            payload['sessionId'] = session_id
        
        response = requests.post(
            url,
            json=payload,
            headers=self._get_headers(),
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def get_history(self, session_id: str) -> Dict:
        """Get conversation history"""
        url = f"{self.base_url}{self.api_prefix}/history/{session_id}"
        response = requests.get(
            url,
            headers=self._get_headers(),
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def clear_session(self, session_id: str) -> Dict:
        """Clear conversation session"""
        url = f"{self.base_url}{self.api_prefix}/session/{session_id}"
        response = requests.delete(
            url,
            headers=self._get_headers(),
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def health_check(self) -> Dict:
        """Check system health"""
        url = f"{self.base_url}{self.api_prefix}/health"
        response = requests.get(url, timeout=self.timeout)
        response.raise_for_status()
        return response.json()
```

---

### **File 2: `datasets/test_queries.json`** (Test Cases)

```json
{
  "retrieval_tests": [
    {
      "query": "Có hoạt động hiến máu nào không?",
      "expected_activity_ids": ["uuid-hien-mau-1", "uuid-hien-mau-2"],
      "expected_keywords": ["hiến máu", "donor", "blood"],
      "ground_truth": "Có 2 hoạt động hiến máu: Hiến máu cơ sở 1 và Hiến máu cơ sở 2"
    },
    {
      "query": "Tôi quan tâm AI và công nghệ",
      "expected_activity_ids": ["uuid-miwai-2025"],
      "expected_keywords": ["MIWAI", "AI", "trí tuệ nhân tạo"],
      "ground_truth": "Bạn nên tham gia hội nghị MIWAI 2025 về trí tuệ nhân tạo"
    }
  ],
  
  "generation_tests": [
    {
      "query": "Link đăng ký MIWAI ở đâu?",
      "expected_in_response": ["https://docs.google.com"],
      "ground_truth_contains": "link đăng ký",
      "context": "Activity MIWAI có registration link"
    }
  ],
  
  "multi_hop_reasoning": [
    {
      "query": "Tôi cần 5 ngày CTXH trong tháng 12, nên đăng ký gì?",
      "requires_calculation": true,
      "ground_truth": "Bạn có thể tham gia MIWAI (1.5 ngày) + Hiến máu (2.5 ngày) + PCCC (1 ngày) = 5 ngày",
      "expected_activities": ["MIWAI", "Hiến máu", "PCCC"]
    }
  ]
}
```

---

### **File 3: `tests/test_rag_pipeline.py`** (Ragas Evaluation)

```python
import pytest
import json
from ragas import evaluate
from ragas.metrics import (
    faithfulness,           # Câu trả lời trung thực với context?
    answer_relevancy,       # Câu trả lời có liên quan đến query?
    context_precision,      # Context có chính xác không?
    context_recall          # Context có đủ thông tin?
)
from datasets import Dataset
from utils.api_client import CTXHChatClient

@pytest.fixture
def client():
    """Khởi tạo API client"""
    return CTXHChatClient()

@pytest.fixture
def test_dataset():
    """Load test queries"""
    with open('datasets/test_queries.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def test_rag_faithfulness(client, test_dataset):
    """Test 1: Faithfulness - Câu trả lời có trung thực với context không?"""
    
    results = []
    
    for test_case in test_dataset['retrieval_tests']:
        # Gọi API backend
        response = client.send_message(test_case['query'])
        
        # Chuẩn bị data cho Ragas
        results.append({
            'question': test_case['query'],
            'answer': response['response'],
            'contexts': [src['activityName'] for src in response['sources']],
            'ground_truth': test_case['ground_truth']
        })
    
    # Chuyển thành Dataset cho Ragas
    dataset = Dataset.from_list(results)
    
    # Đánh giá bằng Ragas
    evaluation = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_precision, context_recall]
    )
    
    print("\n📊 RAG Evaluation Results:")
    print(f"Faithfulness:       {evaluation['faithfulness']:.2f}")
    print(f"Answer Relevancy:   {evaluation['answer_relevancy']:.2f}")
    print(f"Context Precision:  {evaluation['context_precision']:.2f}")
    print(f"Context Recall:     {evaluation['context_recall']:.2f}")
    
    # Assertions
    assert evaluation['faithfulness'] >= 0.7, "Faithfulness quá thấp!"
    assert evaluation['answer_relevancy'] >= 0.7, "Answer relevancy không đạt!"
```

---

### **File 4: `tests/test_retrieval_quality.py`** (DeepEval)

```python
import pytest
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase
from utils.api_client import CTXHChatClient

@pytest.fixture
def client():
    return CTXHChatClient()

def test_retrieval_top_k_accuracy(client):
    """Test 2: Top-K Accuracy - Activity đúng có nằm trong top-3 không?"""
    
    test_cases = [
        {
            'query': 'Hoạt động hiến máu',
            'expected_ids': ['uuid-hien-mau-1', 'uuid-hien-mau-2']
        },
        {
            'query': 'Hội nghị AI',
            'expected_ids': ['uuid-miwai-2025']
        }
    ]
    
    for test in test_cases:
        response = client.send_message(test['query'])
        retrieved_ids = [src['activityId'] for src in response['sources']]
        
        # Check if expected activity in top-3
        hit = any(exp_id in retrieved_ids for exp_id in test['expected_ids'])
        
        assert hit, f"Expected activities {test['expected_ids']} not in top-3: {retrieved_ids}"
        print(f"✅ Query '{test['query']}' retrieved correctly")

def test_deepeval_faithfulness(client):
    """Test 3: DeepEval Faithfulness"""
    
    query = "Link đăng ký MIWAI ở đâu?"
    response = client.send_message(query)
    
    # Tạo test case cho DeepEval
    test_case = LLMTestCase(
        input=query,
        actual_output=response['response'],
        retrieval_context=[src['activityName'] for src in response['sources']]
    )
    
    # Đánh giá faithfulness
    metric = FaithfulnessMetric(threshold=0.7)
    metric.measure(test_case)
    
    assert_test(test_case, [metric])
    print(f"✅ Faithfulness score: {metric.score:.2f}")
```

---

### **File 5: `tests/test_performance.py`** (Performance Testing)

```python
import pytest
import time
import statistics
from utils.api_client import CTXHChatClient

@pytest.fixture
def client():
    return CTXHChatClient()

def test_response_time(client):
    """Test 4: Response time < 5 seconds"""
    
    queries = [
        "Có hoạt động nào vào tháng 12?",
        "Tôi muốn tham gia hiến máu",
        "Link đăng ký MIWAI"
    ]
    
    response_times = []
    
    for query in queries:
        start = time.time()
        response = client.send_message(query)
        end = time.time()
        
        elapsed = (end - start) * 1000  # Convert to ms
        response_times.append(elapsed)
        
        # Backend's measured time
        backend_time = response['responseTime']
        
        print(f"Query: '{query[:30]}...'")
        print(f"  Client-side: {elapsed:.0f}ms")
        print(f"  Backend:     {backend_time}ms")
        
        assert elapsed < 5000, f"Response time too slow: {elapsed}ms"
    
    # Statistics
    avg_time = statistics.mean(response_times)
    p95_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
    
    print(f"\n📊 Performance Stats:")
    print(f"Average:  {avg_time:.0f}ms")
    print(f"P95:      {p95_time:.0f}ms")
    
    assert avg_time < 3000, "Average response time > 3s"
```

---

## **🚀 CÁCH CHẠY TESTS**

### **1. Setup môi trường:**
```bash
cd testing
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### **2. Khởi động backend:**
```bash
cd ../backend
npm run start:dev
```

### **3. Chạy tests:**
```bash
# Chạy tất cả tests
pytest -v

# Chạy specific test file
pytest tests/test_rag_pipeline.py -v

# Chạy với detailed output
pytest tests/test_retrieval_quality.py -v -s

# Generate HTML report
pytest --html=reports/test_report.html --self-contained-html
```

---

## **📊 RAGAS vs DEEPEVAL - KHI NÀO DÙNG GÌ?**

| Framework | Ưu điểm | Use Case |
|-----------|---------|----------|
| **Ragas** | - Metrics chuyên cho RAG<br>- Đánh giá retrieval + generation<br>- Tích hợp Hugging Face | - Đánh giá toàn diện RAG pipeline<br>- So sánh nhiều model<br>- Research-oriented |
| **DeepEval** | - Dễ dùng với pytest<br>- Assertions rõ ràng<br>- CI/CD friendly | - Unit testing từng component<br>- Regression testing<br>- Production monitoring |

**Khuyến nghị:** Dùng **cả hai**:
- **Ragas:** Đánh giá toàn diện (weekly/monthly)
- **DeepEval:** CI/CD pipeline (mỗi khi commit)

---

## **✅ CHECKLIST TRIỂN KHAI**

```
[ ] Tạo thư mục testing/
[ ] Tạo requirements.txt và install packages
[ ] Setup .env.test với backend URL
[ ] Tạo api_client.py wrapper
[ ] Tạo test dataset (JSON)
[ ] Viết test với Ragas
[ ] Viết test với DeepEval
[ ] Chạy thử nghiệm và fix lỗi
[ ] Tích hợp vào CI/CD (GitHub Actions)
[ ] Setup monitoring dashboard
```

Bạn muốn tôi tạo file setup nào trước? Hoặc giải thích chi tiết hơn về metric nào?