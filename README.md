# Label Actions

> Github action to perform actions when issues or pull requests are labeled or unlabeled.

## How It Works

This Github Action performs certain actions when an issue or pull request is labeled or unlabeled. The following actions are supported:

- Post a comment (`comment` option)
- Close (`close` option)
- Reopen (`open` option)
- Lock with an optional lock reason (`lock` and `lockReason` options)
- Unlock (`unlock` option)

## Usage

Create `.github/workflows/label-actions.yml` in the default branch:

```yaml
name: Label Actions
on:
  pull_request:
    types: [labeled, unlabeled]
  issues:
    types: [labeled, unlabeled]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: bubkoo/label-actions@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CONFIG_FILE: .github/label-actions.yml
```

And the default config is:

```yml
# Specify actions for issues and pull requests
common:
  # Actions taken when the `heated` label is added
  heated:
    # Lock the thread
    lock: true
    # Set a lock reason, such as `off-topic`, `too heated`, `resolved` or `spam`
    lockReason: too heated
    # Post a comment
    comment: >
      The thread has been temporarily locked.
      
      Please follow our community guidelines.


  # Actions taken when the `heated` label is removed
  -heated:
    # Unlock the thread
    unlock: true

# Optionally, specify configuration settings just for issues
issues:
  feature:
    # Close the issue
    close: true
    # Post a comment, `${author}` is an optional placeholder
    comment: >
      :wave: @${author}, please use our idea board to request new features.


  -wontfix:
    # Reopen the issue
    open: true

  needs-more-info:
    # Close the issue
    close: true
    comment: >
      In order to communicate effectively, we have a certain format requirement for the issue, your issue is automatically closed because there is no recurring step or reproducible warehouse, and will be REOPEN after the offer.


  -needs-more-info:
    # Reopen the issue
    open: true

# Optionally, specify configuration settings just for pull requests
pulls:
```
