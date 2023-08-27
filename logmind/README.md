# Logmind

Use AI to answer questions related to a body of "daily activity log" documents
stored in "Markdown" format.

## Input Format

The source (markdown) documents have in common the following format:

- First-level header: Month & Year of nested entries
- Second-level header: Day of a single entry

### _Notes_
- To mitigate inconsistency found across raw header values, some normalization 
  logic must be introduced for consistent representation in the AI model._

## Setup

The usual Python setup for `InnovAIteLab` and, in particular:

```shell
$ pip install langchain
```

## References
- [Question Answering on own Data](https://medium.com/@onkarmishra/using-langchain-for-question-answering-on-own-data-3af0a82789ed)
- [MarkdownHeaderTextSplitter](https://python.langchain.com/docs/modules/data_connection/document_transformers/text_splitters/markdown_header_metadata)
