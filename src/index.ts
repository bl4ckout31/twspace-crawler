import 'dotenv/config'
import winston from 'winston'
import { args } from './args'
import { Downloader } from './Downloader'
import { logger as baseLogger } from './logger'
import { SpaceWatcher } from './SpaceWatcher'
import { UserWatcher } from './UserWatcher'
import { Util } from './Util'

class Main {
  private logger: winston.Logger
  private userWatchers: Record<string, UserWatcher> = {}
  private spaceWatchers: Record<string, SpaceWatcher> = {}

  constructor() {
    this.logger = baseLogger.child({ label: '[Main]' })
  }

  public async start() {
    try {
      this.logger.info('Starting...')
      this.logger.info('Args', args)

      const externalConfig = Util.getExternalConfig()
      const users = (args.user || '').split(',')
        .concat((externalConfig.users || []).map((v) => v.username))
        .filter((v) => v)
      if (users.length) {
        this.logger.info('Starting in user mode', { users })
        users.forEach((user) => this.addUserWatcher(user))
        return
      }

      const { id } = args
      if (id) {
        this.logger.info('Starting in space id mode', { id })
        this.addSpaceWatcher(id)
        return
      }

      const { url } = args
      if (url) {
        this.logger.info('Starting in url mode', { url })
        await Downloader.downloadMedia(url, Util.getTimeString())
        return
      }

      this.logger.warn('No args found!')
    } catch (error) {
      this.logger.error(error.message, { stack: error.stack })
    }
  }

  private addUserWatcher(username: string) {
    const watchers = this.userWatchers
    if (watchers[username]) {
      return
    }
    const watcher = new UserWatcher(username)
    watchers[username] = watcher
    watcher.watch()
    watcher.on('data', (id) => {
      this.addSpaceWatcher(id, username)
    })
  }

  private addSpaceWatcher(spaceId: string, username = '') {
    const watchers = this.spaceWatchers
    if (watchers[spaceId]) {
      return
    }
    const watcher = new SpaceWatcher(spaceId, username)
    watchers[spaceId] = watcher
    watcher.watch()
  }
}

new Main().start()