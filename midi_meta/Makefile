
-include .env
export

.PHONY: help
help: ## Prints out the description of the Make targets available
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' Makefile | awk 'BEGIN {FS = ":.*?## "}; {printf "%-20s %s\n", $$1, $$2}'

.PHONY: run-openai
run-openai: REQUIRED_ENV := OPENAI_API_KEY MODEL_NAME INPUT_FILE OUTPUT_FILE
run-openai: check-env ## Runs the metadata gather process on the specified input file
	python main.py --model-type openai --model-name "${MODEL_NAME}" "${INPUT_FILE}" "${OUTPUT_FILE}"

write-updates: REQUIRED_ENV := OUTPUT_DIR METADATA_FILE MIDI_DIR
write-updates: check-env ## Saves the new metadata into an updated set of MIDI file(s)
	python meta_writer.py --output-dir "${OUTPUT_DIR}" "${METADATA_FILE}" "${MIDI_DIR}"


.PHONY: check-env
check-env:
	@for var in $${REQUIRED_ENV}; do \
		if [ -z "$${!var}" ]; then \
			echo "Missing required environment variable: $$var"; \
			exit 1; \
		fi; \
	done