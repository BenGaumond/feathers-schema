import is from 'is-explicit'

export default function idsMatch(a, b) {

  //a has ObjectId api, but b may not
  return is(a, Object) && is(a.equals, Function)
    ? a.equals(b)

    //b has ObjectId api, but a may not
    : is(b, Object) && is(b.equals, Function)
    ? b.equals(a)

    //neither are ObjectIds
    : a === b
}
