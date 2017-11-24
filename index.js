'use strict';
const ip = require('ip');

module.exports = (options) => {
  let remoteIpName = 'remoteIp';
  let isPrivateIpName;
  let trustedHeaderSequence = ['x-forwarded-for', 'x-real-ip'];

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
  }

  if(options && typeof options === 'object'){
    if(isNonEmptyString(options.remoteIpName)){
      remoteIpName = options.remoteIpName;
    }
    if(isNonEmptyString(options.isPrivateIpName)){
      isPrivateIpName = options.isPrivateIpName;
    }
    if(options.trustedHeaderSequence instanceof Array){
      trustedHeaderSequence = options.trustedHeaderSequence.map(c => c.toLowerCase())
    }
  }

  return async (ctx, next) => {
    let ipFromHeader;

    for(let field of trustedHeaderSequence){
      if(typeof ctx.headers[field] === 'string'){
        ipFromHeader = ctx.headers[field].split(', ')[0];
        break;
      }
    }

    ctx[remoteIpName] = ipFromHeader || ctx.ip;

    if(isPrivateIpName){
      ctx[isPrivateIpName] = ip.isPrivate(ctx[remoteIpName]);
    }

    await next();
  }
}