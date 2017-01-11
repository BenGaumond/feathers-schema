// import { assert } from 'chai'
import clear from 'cli-clear'

import api from '../app'

/* global describe it before after */

clear()

describe('Todos', () => {

  before(api.start)

  it('tests should happen here')

  after(api.end)

})
