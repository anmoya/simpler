# System Git CLI for MVP

The MVP will run the system `git` executable through an internal service instead of embedding a Git library. This keeps behavior transparent, respects existing Git configuration and credentials where available, and lets the implementation swap to a library later if the CLI boundary becomes limiting.
