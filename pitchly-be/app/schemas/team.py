import uuid

from pydantic import BaseModel, ConfigDict, Field


class TeamCreate(BaseModel):
    nama_tim: str = Field(min_length=1, max_length=120)


class MemberCreate(BaseModel):
    nama: str = Field(min_length=1, max_length=120)
    peran: str = Field(min_length=1, max_length=120)


class MemberPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nama: str
    peran: str


class TeamPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nama_tim: str
    owner_id: uuid.UUID
    members: list[MemberPublic] = []
