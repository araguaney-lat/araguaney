// IndexedDB no existe en Node. `fake-indexeddb` la implementa entera, así que
// las pruebas ejercitan el mismo código que corre en el teléfono en lugar de
// una versión con la base sustituida por un objeto.
import "fake-indexeddb/auto"
