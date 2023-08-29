import type { Component } from "solid-js"
import sqlJs from "sql.js"
import { createSignal, Show, For } from "solid-js"

const App: Component = () => {
  let db: sqlJs.Database
  const dbFileName = "data.db"

  const [getFolderHandle, setFolderHandle] =
    createSignal<FileSystemDirectoryHandle>()

  const [getPeople, setPeople] = createSignal<any[]>([])
  const [getNewPersonAge, setNewPersonAge] = createSignal(30)
  const [getNewPersonName, setNewPersonName] = createSignal("Bob")

  async function selectDirectory() {
    const pickerOptions = {}

    // @ts-ignore
    const handle = await window.showDirectoryPicker(pickerOptions)
    if (!handle) return
    setFolderHandle(handle)

    await loadDb()

    readDBContent()
  }

  async function loadDb() {
    const dirHandle = getFolderHandle()
    if (!dirHandle) return

    const SQL = await sqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    })
    const fileHandle = await dirHandle.getFileHandle(dbFileName, {
      create: true,
    })
    const file = await fileHandle.getFile()
    // TODO: create DB if not exists
    const arrayBuffer = await file.arrayBuffer()
    // sql.js expects a Uint8Array
    const dbAsUint8Array = new Uint8Array(arrayBuffer)
    db = new SQL.Database(dbAsUint8Array)

    db.exec(
      "CREATE TABLE IF NOT EXISTS people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age INTEGER)"
    )
  }

  async function readDBContent() {
    const [result] = db.exec("SELECT * FROM people")
    if (!result) return
    const { columns, values }: any = result
    const people = values.map((value: any[]) =>
      value.reduce(
        (acc, item, index) => ({ ...acc, [columns[index]]: item }),
        {}
      )
    )

    setPeople(people)
  }

  async function saveDbToFile() {
    const dirHandle = getFolderHandle()
    if (!dirHandle) return

    const fileHandle = await dirHandle.getFileHandle(dbFileName, {
      create: true,
    })

    const binaryArray: Uint8Array = db.export()

    // @ts-ignore
    const writable = await fileHandle.createWritable()
    await writable.write(binaryArray)
    await writable.close()

    alert(`DB saved to ${dbFileName}`)
  }

  function addPerson() {
    const sqlstr = `INSERT INTO people (name, age) VALUES ('${getNewPersonName()}', ${getNewPersonAge()});`
    db.exec(sqlstr)
    readDBContent()
  }

  function deletePerson(id: number) {
    const sqlstr = `DELETE FROM people WHERE id = ${id};`
    db.exec(sqlstr)
    readDBContent()
  }

  return (
    <div>
      <h1>File System API + SQLite</h1>
      <h2>Direcory</h2>
      <div>
        <span>Directory:</span>
        <span>
          {getFolderHandle() ? getFolderHandle()?.name : "Not selected"}
        </span>
        <button onclick={() => selectDirectory()}>Select</button>
      </div>

      <Show when={getFolderHandle()}>
        <h2>DB content</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Age</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            <For each={getPeople()}>
              {(person) => (
                <tr>
                  <td>{person.id}</td>
                  <td>{person.name}</td>
                  <td>{person.age}</td>
                  <td>
                    <button onclick={() => deletePerson(person.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>

        <div>
          <h2>New person</h2>
          <p>
            <label>Name</label>
            <input
              type="text"
              oninput={(e) => setNewPersonName(e.target.value)}
            />
          </p>
          <p>
            <label>Age</label>
            <input
              type="number"
              oninput={(e) => setNewPersonAge(Number(e.target.value))}
            />
          </p>
          <p>
            <button onClick={() => addPerson()}>Add user</button>
          </p>
        </div>
        <h2>Save</h2>
        <div>
          <button onClick={() => saveDbToFile()}>Save DB to file</button>
        </div>
      </Show>
    </div>
  )
}

export default App
