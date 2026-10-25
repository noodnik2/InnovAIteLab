# Home Control AI

## Prologue

I'm interested in leveraging some APIs which may available for me to query and control devices around my house such as:
- Our thermostat,
- Our WiFi router,
- Our kitchen appliances (such as stove and refrigerator, etc.)
- Our Sonos (sound) system,
- Our car (?)
- Our lighting (though I don't think we've got a controller for this yet, but plan to soon),
- Monitor and access (possibly?) some of the computers which may be online,
- Etc. (you get the idea)

Help me to understand which of these - or suggest others I may not have thought about - I'll likely be able to access,
and help me to envision what sort of "dashboard" I'll be able to create.  I understand there are likely lots of off-
the-shelf platforms already available for this, and am open to considering which ones will best meet my desires & needs,
as you and I begin to develop this vision more concretely.

In addition, I'm interested in using natural language to access and control these devices, so thought to leverage MCP
or other connections to you to achieve this vision.  I'm currently learning to develop my own MCP servers to help with
this, so am particularly interested in spotting an opportunity using this approach that will also align with the larger
goal I've outlined above.

Where should we start?

## First Iteration

See the [LOG](./LOG.md)

## Sonos?

> Create a new MCP server in a subfolder using Typescript / node.js to interact with my Sonos system.  Design and later implement it to query what's
> playing, add a song to the current playlist, stop what's playing currently, and search for songs to play.  Make tradeoffs if needed trying to achieve
> those goals, but make choices as needed to the extent those functions aren't available. and create a Makefile I can use with the standard targets to
> build, run & test it.  Use best practices and recent, industry-standard libraries as needed, along with a README.md file showing how to install and run
> it in Claude Code.  Write unit tests that achieve 80% (or greater) test coverage.