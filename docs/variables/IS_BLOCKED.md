[atomic-core](../README.md) / IS\_BLOCKED

# Variable: IS\_BLOCKED

> `const` **IS\_BLOCKED**: `2` = `0x02`

Defined in: [dungeon/colliderFlags.ts:17](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/colliderFlags.ts#L17)

No entity may enter this cell by any means — forced or voluntary.
Solid walls carry this flag.  Pits do NOT: they can be entered via forced
movement (e.g. a shove) even though they are not IS_WALKABLE.
