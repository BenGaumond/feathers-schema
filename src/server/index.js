import './globals'
import app from './app'

/******************************************************************************/
// Server
/******************************************************************************/

const port = app.get('port')
const server = app.listen(port, '0.0.0.0')

server.on('listening', () => log(`App enabled. Server listening on port ${port}`))

export default server
