import io

from pypdf import PdfWriter
from pypdf.generic import (
    ArrayObject,
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
    NumberObject,
)

from app.services.pdf import extract_text


def _make_pdf(text: str) -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=200)
    page = writer.pages[0]

    # Attach a standard Helvetica Type1 font so pypdf can map glyphs to text.
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    font_ref = writer._add_object(font)
    page[NameObject("/Resources")] = DictionaryObject(
        {
            NameObject("/Font"): DictionaryObject({NameObject("/F1"): font_ref}),
            NameObject("/ProcSet"): ArrayObject(
                [NameObject("/PDF"), NameObject("/Text")]
            ),
        }
    )

    stream = DecodedStreamObject()
    stream.set_data(f"BT /F1 14 Tf 20 100 Td ({text}) Tj ET".encode("latin-1"))
    stream[NameObject("/Length")] = NumberObject(len(stream.get_data()))
    page[NameObject("/Contents")] = writer._add_object(stream)

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_extract_text_reads_content():
    pdf = _make_pdf("Pitchly kompetisi")
    out = extract_text(pdf)
    assert "Pitchly" in out
