import is from 'is-explicit'

export default function array(...args) {

  if (args.length === 1)
    args = args[0]

  return is(args, Array) ? args : [args]

}
