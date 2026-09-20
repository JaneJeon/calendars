import { useRef, useState } from 'react'
import {
  Box,
  Button,
  CloseButton,
  Flex,
  Input,
  Popover,
  Portal,
  Stack,
  Text
} from '@chakra-ui/react'
import { ChevronDown, Search } from 'lucide-react'
import type {
  DtsmFilterModel,
  DtsmFilterOption
} from '@janejeon/calendars-shared'
import {
  selectionCheckedState,
  selectionSummary,
  toggleIds,
  type IdSelection
} from '../filters'
import { controlProps, focusRing } from '../theme'
import { FilterCheckboxRow } from './FilterPopover'
import { matchesFilter, visualFilterPanel } from './filter-utils'

export function PlaceFilterPopover(props: {
  selection: IdSelection
  model: DtsmFilterModel
  rawOptions: DtsmFilterOption[]
  defaultIds: readonly number[]
  onChange: (selection: IdSelection) => void
}) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const forcedOpen = visualFilterPanel('places')
  const allIds = [
    ...props.model.placeGroups.flatMap(group => group.ids),
    ...props.model.places.map(place => place.id)
  ]
  const choices = [
    ...props.model.placeGroups,
    ...props.model.places.map(place => ({
      key: `place:${place.id}`,
      name: place.name,
      ids: [place.id]
    }))
  ]
  const summary = selectionSummary(
    props.selection,
    props.rawOptions,
    'places',
    props.defaultIds,
    choices
  )
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const groupRows = props.model.placeGroups.flatMap(group => {
    const groupMatches = matchesFilter(group.name, query)
    const children = group.children.filter(
      child => groupMatches || matchesFilter(child.name, query)
    )
    return children.length > 0 || !normalizedQuery ? [{ group, children }] : []
  })
  const places = props.model.places.filter(place =>
    matchesFilter(place.name, query)
  )
  const central = places.filter(place => place.id === 1137)
  const otherPlaces = places.filter(place => place.id !== 1137)

  return (
    <Popover.Root
      open={forcedOpen || undefined}
      positioning={{ placement: 'bottom-start', gutter: 7 }}
      initialFocusEl={() => searchRef.current}
      onOpenChange={({ open }) => !open && setQuery('')}
    >
      <Popover.Trigger asChild>
        <Button
          {...controlProps}
          minW={{ base: '0', md: '190px' }}
          w={{ base: '100%', md: 'auto' }}
          justifyContent="space-between"
          aria-label={`Places: ${summary}`}
        >
          <Text truncate>{summary}</Text>
          <ChevronDown size={15} color="#AEBAC8" aria-hidden="true" />
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            minW="300px"
            maxW="min(410px, calc(100vw - 28px))"
            p="6px"
            borderWidth="1px"
            borderColor="calendar.controlBorder"
            borderRadius="12px"
            bg="calendar.raised"
            color="calendar.text"
            boxShadow="0 18px 54px rgba(0, 0, 0, .38)"
            zIndex="80"
          >
            <Flex px="8px" py="6px" align="center" justify="space-between">
              <Popover.Title fontSize="13px" fontWeight="600">
                Places
              </Popover.Title>
              <Popover.CloseTrigger asChild>
                <CloseButton
                  aria-label="Close place filters"
                  size="sm"
                  color="calendar.muted"
                  _focusVisible={focusRing}
                />
              </Popover.CloseTrigger>
            </Flex>
            <Flex px="6px" pb="6px" position="relative" align="center">
              <Search
                size={14}
                color="#AEBAC8"
                aria-hidden="true"
                style={{ position: 'absolute', left: 18 }}
              />
              <Input
                ref={searchRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                aria-label="Search places"
                placeholder="Search places"
                h="touchTarget"
                ps="34px"
                borderColor="calendar.controlBorder"
                bg="calendar.inset"
                _focusVisible={focusRing}
              />
            </Flex>
            <Stack
              maxH="min(430px, var(--available-height))"
              overflowY="auto"
              gap="2px"
            >
              <FilterCheckboxRow
                checked={props.selection === null}
                label="All places"
                onChange={checked => props.onChange(checked ? null : [])}
              />
              <Box h="1px" my="3px" bg="calendar.border" />
              {groupRows.map(({ group, children }) => (
                <Box key={group.key}>
                  <FilterCheckboxRow
                    checked={selectionCheckedState(props.selection, group.ids)}
                    label={group.name}
                    onChange={checked =>
                      props.onChange(
                        toggleIds(props.selection, group.ids, checked, allIds)
                      )
                    }
                  />
                  <Box role="group" aria-label={`${group.name} locations`}>
                    {children.map(child => (
                      <FilterCheckboxRow
                        key={child.id}
                        indent
                        checked={selectionCheckedState(props.selection, [
                          child.id
                        ])}
                        label={child.name}
                        onChange={checked =>
                          props.onChange(
                            toggleIds(
                              props.selection,
                              [child.id],
                              checked,
                              allIds
                            )
                          )
                        }
                      />
                    ))}
                  </Box>
                </Box>
              ))}
              {central.map(place => (
                <FilterCheckboxRow
                  key={place.id}
                  checked={selectionCheckedState(props.selection, [place.id])}
                  label={place.name}
                  onChange={checked =>
                    props.onChange(
                      toggleIds(props.selection, [place.id], checked, allIds)
                    )
                  }
                />
              ))}
              {otherPlaces.length > 0 ? (
                <Text
                  px="10px"
                  pt="8px"
                  color="calendar.subtle"
                  fontSize="11px"
                >
                  Other places
                </Text>
              ) : null}
              {otherPlaces.map(place => (
                <FilterCheckboxRow
                  key={place.id}
                  checked={selectionCheckedState(props.selection, [place.id])}
                  label={place.name}
                  onChange={checked =>
                    props.onChange(
                      toggleIds(props.selection, [place.id], checked, allIds)
                    )
                  }
                />
              ))}
              {groupRows.length === 0 && places.length === 0 ? (
                <Text
                  px="10px"
                  py="12px"
                  color="calendar.muted"
                  fontSize="13px"
                >
                  No matching places.
                </Text>
              ) : null}
            </Stack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
