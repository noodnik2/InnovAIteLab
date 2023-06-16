# Chroma

## Incantation

1. Setup the Python environment
```shell
$ pip install -r requirements.txt
```

2. Start the `chromadb` service
```shell
$ (cd ~/repos/chroma-core/chroma; docker-compose up -d)
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

### More Examples

```shell
$ python text-seer.py --load assets/us_history.txt -v
reading(assets/us_history.txt)
RecursiveCharacterTextSplitter
text_splitter.split_documents
Chroma.from_documents
$ python text-seer.py --query "What courses were open to freedmen in 1865?"
 The four courses open to freedmen in 1865 were: fleeing the plantation to
 the nearest town or city, remaining in their cabins and working for daily wages,
 renting from the former master, and striving for ownership of land.
$ python text-seer.py --query "What are some sources of graft tissue?"
 I don''t know.
$ python text-seer.py --load assets/manual_of_surgery.txt 
$ python text-seer.py --query "What are some sources of graft tissue?"
 Autoplastic grafts (from the same individual), homoplastic grafts (from another
 animal of the same species), and heteroplastic grafts (from an animal of another
 species) are possible sources of graft tissue. Connective tissues like fat,
 cartilage, and bone, and skin and its appendages are also sources of graft tissue.
 Mucous membrane can also be used to cover defects in the lip, cheek, and conjunctiva. 
```

## References
- [LangChain + OpenAI Tutorial](https://www.youtube.com/watch?v=DYOU_Z0hAwo)
- [Master PDF Chat with LangChain](https://www.youtube.com/watch?v=ZzgUqFtxgXI)
- [Vector Database Overview](https://www.linkedin.com/pulse/overview-vector-search-libraries-databases-duncan-blythe/)
- [Langchain Chain Index Examples](https://python.langchain.com/en/latest/modules/chains/index_examples/qa_with_sources.html)
- [The Adventures of Sherlock Holmes](https://norvig.com/big.txt)
- [ChromaDB & LangChain for QA on doc](https://github.com/hwchase17/chroma-langchain)