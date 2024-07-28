import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

from sentence_transformers import SentenceTransformer

model_names = [
    # 'all-MiniLM-L6-v2',
    # 'distilbert-base-nli-stsb-mean-tokens',
    # 'bert-base-nli-mean-tokens',
    'albert-base-v1'
]
for model_name in model_names:
    try:
        model = SentenceTransformer(model_name)
        print(f"Model {model_name} loaded successfully.")
    except Exception as e:
        print(f"Error loading model {model_name}: {e}")