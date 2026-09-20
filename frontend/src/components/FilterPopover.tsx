import { useRef, useState, type Ref } from 'react'
import {
  Box,
  Button,
  Checkbox,
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
  DtsmFilterOption,
  DtsmSemanticChoice
} from '@janejeon/calendars-shared'
import {
  selectionCheckedState,
  selectionSummary,
  toggleIds,
  type IdSelection
} from '../filters'
import { controlProps, focusRing } from '../theme'
import { matchesFilter, visualFilterPanel } from './filter-utils'

export function FilterCheckboxRow({
  checked,
  label,
  inputRef,
  indent,
  onChange
}: {
  checked: boolean | 'indeterminate'
  label: string
  inputRef?: Ref<HTMLInputElement>
  indent?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={({ checked }) => onChange(checked === true)}
      minH="touchTarget"
      w="100%"
      px="10px"
      ps={indent ? '34px' : '10px'}
      gap="10px"
      borderRadius="8px"
      color="calendar.text"
      fontSize="13px"
      cursor="pointer"
      _hover={{ bg: 'action.subtle' }}
      _focusWithin={focusRing}
    >
      <Checkbox.HiddenInput ref={inputRef} />
      <Checkbox.Control flexShrink="0" colorPalette="action">
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Label flex="1">{label}</Checkbox.Label>
    </Checkbox.Root>
  )
}

export function FilterPopover(props: {
  label: string
  noun: string
  selection: IdSelection
  choices: DtsmSemanticChoice[]
  rawOptions: DtsmFilterOption[]
  defaultIds?: readonly number[]
  searchable?: boolean
  onChange: (selection: IdSelection) => void
}) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const allRef = useRef<HTMLInputElement>(null)
  const choices = props.choices.filter(choice =>
    matchesFilter(choice.name, query)
  )
  const allIds = props.choices.flatMap(choice => choice.ids)
  const forcedOpen = visualFilterPanel(props.label.toLocaleLowerCase())
  const summary = selectionSummary(
    props.selection,
    props.rawOptions,
    props.noun,
    props.defaultIds,
    props.choices
  )
  return (
    <Popover.Root
      open={forcedOpen || undefined}
      positioning={{ placement: 'bottom-start', gutter: 7 }}
      initialFocusEl={() =>
        props.searchable ? searchRef.current : allRef.current
      }
      onOpenChange={({ open }) => !open && setQuery('')}
    >
      <Popover.Trigger asChild>
        <Button
          {...controlProps}
          minW={{ base: '0', md: '190px' }}
          w={{ base: '100%', md: 'auto' }}
          justifyContent="space-between"
          aria-label={`${props.label}: ${summary}`}
        >
          <Text truncate>{summary}</Text>
          <ChevronDown size={15} color="#AEBAC8" aria-hidden="true" />
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            minW="260px"
            maxW="min(390px, calc(100vw - 28px))"
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
                {props.label}
              </Popover.Title>
              <Popover.CloseTrigger asChild>
                <CloseButton
                  aria-label={`Close ${props.label.toLocaleLowerCase()} filters`}
                  size="sm"
                  color="calendar.muted"
                  _focusVisible={focusRing}
                />
              </Popover.CloseTrigger>
            </Flex>
            {props.searchable ? (
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
                  aria-label={`Search ${props.noun}`}
                  placeholder={`Search ${props.noun}`}
                  h="touchTarget"
                  ps="34px"
                  borderColor="calendar.controlBorder"
                  bg="calendar.inset"
                  _focusVisible={focusRing}
                />
              </Flex>
            ) : null}
            <Stack
              maxH="min(430px, var(--available-height))"
              overflowY="auto"
              gap="2px"
            >
              <FilterCheckboxRow
                inputRef={allRef}
                checked={props.selection === null}
                label={`All ${props.noun}`}
                onChange={checked => props.onChange(checked ? null : [])}
              />
              <Box h="1px" my="3px" bg="calendar.border" />
              {choices.map(choice => (
                <FilterCheckboxRow
                  key={choice.key}
                  checked={selectionCheckedState(props.selection, choice.ids)}
                  label={choice.name}
                  onChange={checked =>
                    props.onChange(
                      toggleIds(props.selection, choice.ids, checked, allIds)
                    )
                  }
                />
              ))}
              {choices.length === 0 ? (
                <Text
                  px="10px"
                  py="12px"
                  color="calendar.muted"
                  fontSize="13px"
                >
                  No matching {props.noun}.
                </Text>
              ) : null}
            </Stack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
