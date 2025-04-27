set -xeuo pipefail

## For a single file:
#echo exiftool -Title="Song Title" -Artist="Artist Name" -Copyright="Copyright Info" -Comment="Interesting comment" input.mid

OUTPUT_DIR=~/tmp/out
mkdir "${OUTPUT_DIR}"

METADATA_JSON=~/tmp/25041621-gsmid-meta-head-jq-out.json

# To process all files from the JSON in a for loop directly in the terminal:
for file in $(jq -r 'keys[]' ${METADATA_JSON}); do
  title=$(jq -r ".[\"$file\"].title.name" ${METADATA_JSON})
  artist=$(jq -r ".[\"$file\"].artist.name" ${METADATA_JSON})
  copyright=$(jq -r ".[\"$file\"].copyright.text" ${METADATA_JSON})
  comment=$(jq -r ".[\"$file\"].comment.text" ${METADATA_JSON})

  cp "$file" "${OUTPUT_DIR}"
  OUTPUT_FILENAME=${file##*/}
  OUTPUT_FILEPATH="${OUTPUT_DIR}/${OUTPUT_FILENAME}"
  echo exiftool -overwrite_original -Title="$title" -Artist="$artist" -Copyright="$copyright" -Comment="$comment" "${OUTPUT_FILEPATH}"
  ls -l "${OUTPUT_FILEPATH}"
done
