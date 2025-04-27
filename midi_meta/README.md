
### Setup

```
$ PATH="/Users/martyross/.local/bin:$PATH"
```


### Orchestrations

#### Read the Metadata

```shell
$ python meta_reader.py ~/repos/noodnik2/mzb/samples/src/240818-nuvi/gs/l100* --output ~/tmp/meta_reader_l100.json
```

#### Add the LMM Metadata

```shell
$ python main.py --model-type openai --model-name gpt-4 ~/tmp/meta_reader_l100.json ~/tmp/lmm_output_l100.json
```

### Update the Database

```shell
$ python fmm.py --update < ~/tmp/lmm_output_l100.json
```

### Render the `.m4a` from the `.mid`

...

### Produce the `exiftool` Commands

Needs some work to select the files and link them to the new `.m4a` rendered versions.

```shell
$ python fmm.py --query l1001_04.mid l1002_02.mid ...
```

