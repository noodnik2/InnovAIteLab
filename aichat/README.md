# [`aichat`](https://github.com/sigoden/aichat)

Seems too good to be true; but, I decided to try it anyways.

After starting an Ollama container:

```shell
$ brew install aichat
$ aichat --info
> No config file, create a new one? Yes
> Platform: ollama
? API Base: http://localhost:11434/
> API Key:
✓ Saved config file to '/Users/martyross/Library/Application Support/aichat/config.yaml'.
...
```

Check the configuration:

```shell
$ ls -l ~/Library/Application\ Support/aichat/config.yaml
-rw-------@ 1 martyross  staff  189 Dec  1 14:43 /Users/martyross/Library/Application Support/aichat/config.yaml
$
```

