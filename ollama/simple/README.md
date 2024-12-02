# Simple Ollama

## Within Docker

### Links

- [Image](https://hub.docker.com/r/ollama/ollama)
- [With WebUI](https://github.com/valiantlynx/ollama-docker/blob/main/docker-compose.yml)
- [Matt Williams Video](https://www.youtube.com/watch?v=ZoxJcPkjirs)
- [IDE Integration with Continue](https://medium.com/@omargohan/using-ollama-in-your-ide-with-continue-e8cefeeee033)
  - [Continue](https://github.com/continuedev/continue)
  - [With Ollama](https://docs.continue.dev/customize/model-providers/ollama)

### Simple

#### `docker-compose.yml`:

```dockerfile
version: '3.8'

services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - "./ollama-data:/root/.ollama"
```

Run it:
```shell
$ docker-compose up
...
```

In another terminal:
```shell
$ curl http://localhost:11434/
Ollama is running
$
```

Now load a model into it:

```shell
$ docker exec -it simple-ollama-1 bash
root@19fd1cc112f0:/# ollama pull nomic-embed-text
...
Success!
```

That one didn't allow chat, so loaded several other
models trying to get something working.  I kept getting
errors like this:

> _llama_model_load: error loading model: done_getting_tensors: wrong number of tensors; expected 147, got 146_

Gave up.

