from app.storage.local import LocalStorage


def test_save_then_read(tmp_path):
    storage = LocalStorage(str(tmp_path))
    path = storage.save(b"halo dunia", "user1/doc.pdf")
    assert storage.read("user1/doc.pdf") == b"halo dunia"
    assert str(tmp_path) in path
    # read must also accept the absolute path returned by save (regression:
    # doubled prefix /data/uploads/data/uploads/...).
    assert storage.read(path) == b"halo dunia"


def test_delete_via_absolute_path(tmp_path):
    storage = LocalStorage(str(tmp_path))
    path = storage.save(b"x", "u/d.pdf")
    storage.delete(path)
    assert not (tmp_path / "u" / "d.pdf").exists()
