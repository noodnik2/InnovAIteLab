# Chroma

## Incantation

1. Setup the Python environment
```shell
$ pip install -r requirements.txt
```

2. Start the `chromadb` service
```shell
$ (cd ~/repos/chroma-core/chroma; docker-compose -d up)
```

3. Add some data
```shell
$ python text-seer.py --load assets/boy_who_cried_wolf.txt
```

4. Ask a question
```shell
$ python text-seer.py --query "What's the moral of the story?"
 The moral of the story is that nobody believes a liar, even when he is telling the truth.
```

## References
- [LangChain + OpenAI Tutorial](https://www.youtube.com/watch?v=DYOU_Z0hAwo)
- [Master PDF Chat with LangChain](https://www.youtube.com/watch?v=ZzgUqFtxgXI)
- [Vector Database Overview](https://www.linkedin.com/pulse/overview-vector-search-libraries-databases-duncan-blythe/)
- [Langchain Chain Index Examples](https://python.langchain.com/en/latest/modules/chains/index_examples/qa_with_sources.html)
- [The Adventures of Sherlock Holmes](https://norvig.com/big.txt)
- [ChromaDB & LangChain for QA on doc](https://github.com/hwchase17/chroma-langchain)