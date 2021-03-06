const Promise = require('bluebird')
const promisify = Promise.promisify

const {dirname, extname} = require('path')
const stat = promisify(require('fs').stat)

const log = require('npmlog')

const Cover = require('../models/cover.js')
const flac = require('./flac.js')
const unzip = require('../utils/zip.js').unpack

function extractRelease (zipfile, tmpdir, covers, groups) {
  log.verbose('extractReleaseMetadata', 'archive:', zipfile)

  return unzip(zipfile, groups, tmpdir)
          .then(list => scan(list, groups))
          .then(list => populateImages(list, covers))
          .then(list => list.filter(e => !(e instanceof Cover ||
                                           e instanceof Error)))
}

function scan (bundles, groups) {
  return Promise.map(
    [].concat(...bundles),
    bundle => {
      const e = bundle.path
      switch (extname(e)) {
        case '.flac':
          return flac.scan(bundle, groups)
        case '.jpg':
        case '.pdf':
        case '.png':
          return stat(e).then(stats => new Cover(e, stats))
        default:
          log.error('scan', "don't recognize type of", e)
          return Promise.reject(new Error("don't recognize type of " + e))
      }
    }
  )
}

function populateImages (list, covers) {
  list.filter(e => e instanceof Cover)
      .forEach(c => {
        const directory = dirname(c.path)
        if (!covers.get(directory)) {
          log.silly('scan', 'creating image list for', directory)
          covers.set(directory, [])
        }
        log.silly('scan', 'cover', c)
        covers.get(directory).push(c)
      })

  return list
}

module.exports = { extractRelease }
