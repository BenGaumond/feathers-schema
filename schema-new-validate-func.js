/* global is check name ANY array */
class Property {

  typeCheck(value) {



  }

  async validate(value, params) {

    let results = check(value, this.type, this.array)
    if (results)
      return results

    //if we passed type checking, we run each of the validators on the value
    for (const validator of this.validators) {
      results = await validator(value, params)

      //if the validator failed, we don't need to continue
      if (results)
        return results
    }

    //if there are no sub properties, we don't need to continue
    if (!this.properties)
      return results

    const values = array(value)

    results = array(results)

    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      let result = false

      for (const property of this.properties) {
        const { key } = property

        //we don't need to check if value is an object, because it's only possible
        //to get here if it is one
        const keyResult = await property.validate(value[key], params)
        if (!keyResult)
          continue

        //ensure result is an object before filling the errors of this values
        //sub properties
        result = result || {}
        result[key] = keyResult

      }

      result[i] = result
    }

    return this.array

      //if this is an array value, we only send back an array of results if any of the results are truthy
      ? results.some(result => result) ? results : false

      //otherwise the first result in results will be the result of the singular type check
      : results[0]

  }

}
