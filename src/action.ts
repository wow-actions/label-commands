import * as core from '@actions/core'
import * as github from '@actions/github'
import { Util } from './util'
import { Config } from './config'

export namespace Action {
  export async function run() {
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

      core.info(
        `Load config from "${configPath}": \n${JSON.stringify(
          config,
          null,
          2,
        )}`,
      )

      core.info(JSON.stringify(context, null, 2))

      let label = context.payload.label as string
      if (context.payload.action === 'unlabeled') {
        label = `-${label}`
      }

      const actions = Config.getActions(
        config,
        context.payload.issue != null ? 'issues' : 'pulls',
        label,
      )

      const payload = context.payload.issue || context.payload.pull_request
      if (payload) {
        const { comment, open, close, lock, unlock, lockReason } = actions
        const params = { ...context.repo, issue_number: payload.number }

        if (comment) {
          const body = Util.pickComment(comment, {
            author: payload.user.login,
          })

          await Util.ensureUnlock(octokit, context, () => {
            octokit.issues.createComment({ ...params, body })
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
      }
    }
  }
}
