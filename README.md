<h1 align="center">Label Commands</h1>
<p align="center"><strong>Perform commands when issues or pull requests are labeled or unlabeled</strong></p>

## How It Works

This Github Action performs certain commands when an issue or pull request is labeled or unlabeled. The following commands are supported:

- Post a comment (`comment` and `reactions` option)
- Close (`close` option)
- Reopen (`open` option)
- Lock with an optional lock reason (`lock` and `lockReason` options)
- Unlock (`unlock` option)
- Pin (`pin` option, pin an issue)
- UnPin (`unpin` option, unpin an issue)
- Add or remove labels (`labels` option), label prefixed with `-` will be removed, other label will be added. Support array of labels or space separated labels.

## Usage

Create `.github/workflows/label-commands.yml` in the default branch:

```yaml
name: Label Commands
on:
  pull_request:
    types: [labeled, unlabeled]
  issues:
    types: [labeled, unlabeled]
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/label-commands@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CONFIG_FILE: your-config-file-path # .github/workflows/config/label-commands.yml
```

### Inputs

Various inputs are defined to let you configure the action:

> Note: [Workflow command and parameter names are not case-sensitive](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-commands-for-github-actions#about-workflow-commands).

- `GITHUB_TOKEN`: Your GitHub token for authentication.
- `CONFIG_FILE`: Path to configuration file. Custom config will [deep merged](https://lodash.com/docs/4.17.15#merge) with the following default config:

```yml
# Specify commands for issues and pull requests
# ---------------------------------------------

# Actions taken when the `heated` label is added
heated:
  # Lock the thread
  lock: true
  # Set a lock reason, such as `off-topic`, `too heated`, `resolved` or `spam`
  lockReason: too heated
  # Reactions to be added to comment
  reactions: ['eyes', 'heart']
  # Post a comment
  comment: >
    The thread has been temporarily locked.
    
    Please follow our community guidelines.


# Actions taken when the `heated` label is removed
-heated:
  # Unlock the thread
  unlock: true

# Optionally, specify commands just for issues
# --------------------------------------------
issues:
  feature:
    # Close the issue
    close: true
    # Post a comment, `{{ author }}` is an optional placeholder
    comment: >
      :wave: @{{ author }}, please use our idea board to request new features.


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

# Optionally, specify commands just for pull requests
# ---------------------------------------------------
pulls:
```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
