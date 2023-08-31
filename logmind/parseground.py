# see https://medium.com/@onkarmishra/using-langchain-for-question-answering-on-own-data-3af0a82789ed

# from lcproxy.text_splitter import MarkdownHeaderTextSplitter
from langchain.text_splitter import MarkdownHeaderTextSplitter
from langchain.text_splitter import RecursiveCharacterTextSplitter

from log_loader import find_paths


def split_markdown(markdown_text):

    headers_to_split_on = [
        ("#", "Month"),
        ("##", "Day"),
        ("###", "Subject"),
    ]

    markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    md_header_splits = markdown_splitter.split_text(markdown_text)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=150
    )

    # mdhtype = type(md_header_splits[0])
    # docs = [
    #     Document(page_content=chunk["content"], metadata=chunk["metadata"])
    #     for chunk in md_header_splits
    # ]
    docs = md_header_splits
    sp = text_splitter.split_documents(docs)

    return sp


def load_documents(paths):
    files_processed = 0
    max_files = 200
    docs = []
    for path in paths:
        if files_processed > max_files:
            break
        text = open(path).read()
        splits = split_markdown(text)
        # print(f"file({path}), splits({splits})")
        docs.extend(splits)
        files_processed += 1
    return docs


docs = load_documents(find_paths("/Users/martyross/repos/noodnik2/mdr-cr/cxcms/worklogs", ".md"))
print(f"# of docs is {len(docs)})")
all_docs = dict()
for doc in docs:
    # print(f"{doc.metadata.values()} [{len(doc.page_content)}]: {doc.page_content}")
    # print(f"{doc.metadata.values()} [{len(doc.page_content)}]")
    month_key = "Month"
    if month_key not in doc.metadata:
        print(f"{month_key} not found in doc({doc})")
        continue
    doc_month = doc.metadata["Month"]
    if doc_month not in all_docs:
        all_docs[doc_month] = []
    all_docs[doc_month].append(doc)

for m, docs in all_docs.items():
    print(f"{m} [{len(docs)}]")

