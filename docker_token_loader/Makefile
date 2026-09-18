
TOKENIZATION_API_URL=http://localhost:8000

help:
	@fgrep -h "##" $(MAKEFILE_LIST) | grep -v fgrep | sed 's/\(.*\):.*## \(.*\)/\1 - \2/' | sort

build: ## build the custom docker image
	docker compose build

up: ## Bring up the Docker stack
	docker compose up

load-file: ## Load the file provided by FN and MIME type parameters
	@curl -X 'POST' \
	"$(TOKENIZATION_API_URL)/upload" \
	-H 'accept: application/json' \
	-H 'Content-Type: multipart/form-data' \
	-F "file=@$(FN);type=$(TYPE)"

load-sample-texts: ## Load all of the sample *.txt files
	for x in data/sample/*.txt; do $(MAKE) load-file FN=$$x TYPE=text/plain; done

do-search: ## Perform a search using the provided QUERY parameter
	@curl -X 'POST' \
	  "$(TOKENIZATION_API_URL)/search" \
	  -H 'accept: application/json' \
	  -H 'Content-Type: application/json' \
	  -d "{ \
	  \"query\": \"$(QUERY)\", \
	  \"limit\": 2 \
	}"

do-search-profession: ## Search for Elara's profession or title
	$(MAKE) do-search QUERY="What was Elara's profession or title?"

do-search-flowers: ## Search for the name of the glowing flowers
	$(MAKE) do-search QUERY="What was the name of the glowing flowers growing near the shore?"

do-search-body-color: ## Search for the color of the water elemental's body
	$(MAKE) do-search QUERY="What was the specific color of the water elemental's body?"
