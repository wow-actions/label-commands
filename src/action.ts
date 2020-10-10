import * as core from '@actions/core'
import * as github from '@actions/github'
import { Util } from './util'
import { Config } from './config'

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
            pin,
            unpin,
          } = actions
          const params = { ...context.repo, issue_number: payload.number }

          if (pin) {
            await Util.pin(octokit, true)
          }

          if (unpin) {
            await Util.pin(octokit, false)
          }

          if (comment) {
            await Util.comment(octokit, comment, reactions, {
              author: payload.user.login,
            })
          }

          if (open && payload.state === 'closed') {
            await octokit.issues.update({ ...params, state: 'open' })
          }

          if (close && payload.state === 'open') {
            await octokit.issues.update({ ...params, state: 'closed' })
          }

          if (lock && !payload.locked) {
            await octokit.issues.lock({
              ...params,
              lock_reason: lockReason,
            })
          }

          if (unlock && payload.locked) {
            await octokit.issues.unlock({ ...params })
          }

          if (labels) {
            await Util.label(octokit, labels)
          }
        }
      }
    } catch (e) {
      core.error(e)
      core.setFailed(e.message)
    }
  }
}
