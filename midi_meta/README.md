
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

## Phases

### Pass: 1

1. Collect Raw Metadata
   - Inputs: folder id or list of file(s)
   - Output: JSON file with path(s) to MIDI file(s) and raw metadata for each
2. Distill Metadata
   - Input: JSON file with path(s) to MIDI file(s) and raw metadata for each
   - Output: JSON file with path(s) to MIDI file(s) and distilled metadata for each
2b. Record Metadata
   - Input: JSON file with path(s) to MIDI file(s) and distilled metadata for each
   - Output: JSON file with path(s) to MIDI file(s) and confirmation of update (i.e., of the db entry)
     for each
3. Render `.wav` Files
   - Input: JSON file with path(s) to MIDI file(s)
   - Output: JSON file with path(s) to MIDI file(s) and location of associated `.wav` file(s)
4. Render `.m4a` Files
    - Input: JSON file with path(s) to MIDI file(s) and location of associated `.wav` file(s)
    - Output: JSON file with path(s) to MIDI file(s) and location of associated `.m4a` file(s)
4b. Record Metadata
   - Input: JSON file with path(s) to MIDI file(s) and location of associated `.m4a` file(s)
   - Output: JSON file with path(s) to MIDI file(s) and confirmation of update (i.e. of the `.m4a` file)
     for each

### Pass: 2

1. Establish an empty database
2. Import a selected set of MIDI files
3. Collect raw metadata
   - Scans the selected set of MIDI files and collects the raw metadata from them,
     imported to the database
   - Selection of which files to process can be based upon "those without raw metadata"
4. Distill raw metadata
   - Distill the raw metadata from the database of the selected set of MIDI files,
     imported to the database.
   - Selection of which files to process can be based upon "those with raw metadata
     but no distilled metadata."
5. Render selected set of MIDI files into .wav format.
   - Renders the selected set of MIDI files into .wav format, and records the location
     of the rendered .wav file(s) into the database.
   - Selection of which MIDI files to render can be based upon "those without a corresponding
     .wav file."
6. Render selected set of .wav files into .m4a format.
   - Renders the selected set of .wav files into .m4a format, and records the location
     of the rendered .m4a file(s) into the database.
   - Selection of which .wav files to render can be based upon "those without a corresponding
     .m4a file."
7. Update metadata on selected .m4a files.
   - Updates the metadata of the selected set of .m4a files using the distilled metadata of
     the corresponding MIDI file.
   - Selection of which .wav files to render can be based upon "those without a corresponding
     .m4a file."

   