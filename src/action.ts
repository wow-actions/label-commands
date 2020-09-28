import * as core from '@actions/core'
import * as github from '@actions/github'
import { Util } from './util'
import { Config } from './config'
import { Reaction } from './reaction'

export namespace Action {
  export async function run() {
    try {
      if (
        Util.isValidEvent('issues', 'labeled') ||
        Util.isValidEvent('issues', 'unlabeled') ||
        Util.isValidEvent('pull_request', 'labeled') ||
        Util.isValidEvent('pull_request', 'unlabeled')
      ) {
        const context = github.context
        const configPath = core.getInput('CONFIG_FILE')
        const octokit = Util.getOctokit()
        const config = await Config.get(octokit, configPath)

        if (configPath) {
          core.debug(
            `Load config from "${configPath}": \n${JSON.stringify(
              config,
              null,
              2,
            )}`,
          )
        }

        let label = context.payload.label.name as string
        if (context.payload.action === 'unlabeled') {
          label = `-${label}`
        }

        const actions = Config.getActions(
          config,
          context.payload.issue != null ? 'issues' : 'pulls',
          label,
        )

        core.debug(`Label: ${context.payload.label.name}`)
        core.debug(`Actions: ${JSON.stringify(actions, null, 2)}`)

        const payload = context.payload.issue || context.payload.pull_request
        if (payload) {
          const {
            comment,
            reactions,
            open,
            close,
            lock,
            unlock,
            lockReason,
            labels,
          } = actions
          const params = { ...context.repo, issue_number: payload.number }

          if (comment) {
            const body = Util.pickComment(comment, {
              author: payload.user.login,
            })

            await Util.ensureUnlock(octokit, context, async () => {
              const { data } = await octokit.issues.createComment({
                ...params,
                body,
              })

              if (reactions) {
                Reaction.add(octokit, data.id, reactions)
              }
            })
          }

          if (open && payload.state === 'closed') {
            await octokit.issues.update({ ...params, state: 'open' })
          }

          if (close && payload.state === 'open') {
            await octokit.issues.update({ ...params, state: 'closed' })
          }

          if (lock && !payload.locked) {
            await Util.lockIssue(octokit, context, lockReason)
          }

          if (unlock && payload.locked) {
            await octokit.issues.unlock({ ...params })
          }

          if (labels) {
            const labelsToAdd: string[] = []
            const labelsToRemove: string[] = []

            if (Array.isArray(labels)) {
              labels.forEach((label) => {
                if (label.startsWith('-')) {
                  labelsToRemove.push(label.substr(1))
                } else {
                  labelsToAdd.push(label)
                }
              })
            } else {
              if (labels.startsWith('-')) {
                labelsToRemove.push(labels.substr(1))
              } else {
                labelsToAdd.push(labels)
              }
            }

            if (labelsToAdd.length) {
              octokit.issues.addLabels({ ...params, labels: labelsToAdd })
            }

            labelsToRemove.forEach((name) => {
              octokit.issues.removeLabel({ ...params, name })
            })
          }
        }
      }
    } catch (e) {
      core.error(e)
      core.setFailed(e.message)
    }
  }
}
