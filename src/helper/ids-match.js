export default function idsMatch (a, b) {

  // ids can be numbers, objectIds or strings.
  // so if we cast everything to a string, we wont get any
  // false negatives.
  return String(a) === String(b)

}
