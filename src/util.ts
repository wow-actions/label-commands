import * as core from '@actions/core'
import * as github from '@actions/github'
import mustache from 'mustache'
import random from 'lodash.random'
import { Config } from './config'
import { Reaction } from './reaction'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export function pickComment(
    content: string | string[],
    args?: { [key: string]: string },
  ) {
    let result: string
    if (typeof content === 'string' || content instanceof String) {
      result = content.toString()
    } else {
      const pos = random(0, content.length, false)
      result = content[pos] || content[0]
    }

    return args ? mustache.render(result, args) : result
  }

  export function isValidEvent(event: string, action?: string) {
    const { context } = github
    const { payload } = context
    if (event === context.eventName) {
      return action == null || action === payload.action
    }
    return false
  }

  export async function getFileContent(
    octokit: ReturnType<typeof getOctokit>,
    path: string,
  ) {
    try {
      const response = await octokit.rest.repos.getContent({
        ...github.context.repo,
        path,
      })

      const { content } = response.data as any
      return Buffer.from(content, 'base64').toString()
    } catch (err) {
      return null
    }
  }

  export async function ensureUnlock(
    octokit: ReturnType<typeof getOctokit>,
    callback: (() => void) | (() => Promise<any>),
  ) {
    const { context } = github
    const payload = context.payload.issue || context.payload.pull_request
    if (payload && payload.locked) {
      const params = { ...context.repo, issue_number: payload.number }
      const lockReason = payload.active_lock_reason as Config.LockReason
      await octokit.rest.issues.unlock({ ...params })
      await callback()
      await octokit.rest.issues.lock({
        ...params,
        lock_reason: lockReason,
      })
    } else {
      await callback()
    }
  }

  export async function comment(
    octokit: ReturnType<typeof getOctokit>,
    content: string | string[],
    reactions: string | string[] | undefined,
    metadata: any,
  ) {
    const { context } = github
    const payload = (context.payload.issue || context.payload.pull_request)!
    const params = { ...context.repo, issue_number: payload.number }
    const body = pickComment(content, {
      ...metadata,
      author: payload.user.login,
    })

    return ensureUnlock(octokit, async () => {
      const { data } = await octokit.rest.issues.createComment({
        ...params,
        body,
      })

      if (reactions) {
        await Reaction.add(octokit, data.id, reactions)
      }
    })
  }

  export async function label(
    octokit: ReturnType<typeof getOctokit>,
    labels: string | string[],
  ) {
    const labelsToAdd: string[] = []
    const labelsToRemove: string[] = []
    const { context } = github
    const payload = (context.payload.issue || context.payload.pull_request)!
    const params = { ...context.repo, issue_number: payload.number }

    const handle = (lbl: string) => {
      if (lbl.startsWith('-')) {
        labelsToRemove.push(lbl.substr(1))
      } else {
        labelsToAdd.push(lbl)
      }
    }

    const split = (raw: string) =>
      raw
        .split(/[\s\n\r]+/)
        .map((lbl) => lbl.trim())
        .filter((lbl) => lbl.length > 0)

    if (Array.isArray(labels)) {
      labels.forEach(handle)
    } else {
      split(labels).forEach((lbl) => handle(lbl))
    }

    core.debug(`labelsToAdd: ${JSON.stringify(labelsToAdd)}`)
    core.debug(`labelsToRemove: ${JSON.stringify(labelsToRemove)}`)

    const deferArr: Promise<any>[] = []

    if (labelsToAdd.length) {
      deferArr.push(
        octokit.rest.issues.addLabels({ ...params, labels: labelsToAdd }),
      )
    }

    labelsToRemove.forEach((name) => {
      deferArr.push(octokit.rest.issues.removeLabel({ ...params, name }))
    })

    return Promise.all(deferArr)
  }

  export async function pin(
    octokit: ReturnType<typeof getOctokit>,
    pinned: boolean,
  ) {
    // https://developer.github.com/v4/input_object/pinissueinput/
    const mutation = pinned
      ? `mutation ($input: PinIssueInput!) {
          pinIssue(input: $input) {
            issue {
              title
            }
          }
        }`
      : `mutation ($input: UnpinIssueInput!) {
          unpinIssue(input: $input) {
            issue {
              title
            }
          }
        }`

    const { context } = github
    const payload = (context.payload.issue || context.payload.pull_request)!
    return octokit.graphql(mutation, {
      input: {
        issueId: payload.node_id,
        clientMutationId: 'top3 pinned',
      },
      headers: {
        Accept: 'application/vnd.github.elektra-preview',
      },
    })
  }
}
