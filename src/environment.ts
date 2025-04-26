// Defines default environment variables
// Values can be overwritten by environment variables or in .env files

// Common required variable
const requiredVariables: string[] = []
requiredVariables.forEach((field) => {
  if (!process.env[field]) {
    throw 'Required evnironment variable not set: ' + field
  }
})

export const Environment: Environment = {
  server: {
    node_env: process.env.NODE_ENV || 'development',
    port: process.env.SERVER_PORT || 3001,
    no_db_exit: process.env.NO_DB_EXIT || 'false', // Exit process when not connected to DB
    status: process.env.STATUS || 'OK',
  },
}
