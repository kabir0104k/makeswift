import {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Descendant, createEditor } from 'slate'
import isHotkey from 'is-hotkey'
import {
  withReact,
  ReactEditor,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  Editable,
} from 'slate-react'

import {
  RichTextV2Control,
  RichTextV2ControlData,
  RichTextV2ControlDefinition,
  RichTextV2Mode,
} from '../../../../../controls'
import { useBuilderEditMode } from '../../..'
import { BuilderEditMode } from '../../../../../state/modules/builder-edit-mode'
import { pollBoxModel } from '../../../poll-box-model'
import {
  BlockPlugin,
  InlineModePlugin,
  InlinePlugin,
  LinkPlugin,
  TextAlignPlugin,
  TypographyPlugin,
  withBuilder,
  withLocalChanges,
} from '../../../../../slate'
import { useSyncDOMSelection } from './useSyncDOMSelection'
import { BlockType } from '../../../../../slate'
import { RichTextV2Element } from './render-element'
import { RichTextV2Leaf } from './render-leaf'
import { richTextV2DataToDescendents } from '../../../../../controls/rich-text-v2/translation'
import { useSyncRemoteChanges } from './useRemoteChanges'

export type RichTextV2ControlValue = ReactNode

export type Descriptors = { text?: RichTextV2ControlDefinition }

const defaultText: Descendant[] = [{ type: BlockType.Default, children: [{ text: '' }] }]

type Props = {
  text?: RichTextV2ControlData
  definition: RichTextV2ControlDefinition
  control: RichTextV2Control | null
}

export function EditableTextV2({ text, definition, control }: Props) {
  const plugins = useMemo(() => {
    const plugins = [
      /**
       * TODO: we are manually referencing our default plugins for each mode here because
       * Referencing the real LinkPlugin causes a circular dependency.
       * When circular dependencies calm down we should update the plugin definition to use real plugins,
       * and just use the plugins that are defined by our config.
       */
      // ...(definition?.config?.plugins ?? []),
      ...(definition?.config?.mode === RichTextV2Mode.Inline
        ? [InlineModePlugin()]
        : [BlockPlugin(), TypographyPlugin(), TextAlignPlugin(), InlinePlugin(), LinkPlugin()]),
    ]
    return plugins
  }, [definition])

  const [editor] = useState(() =>
    plugins.reduceRight(
      (editor, plugin) => plugin?.withPlugin?.(editor) ?? editor,
      withLocalChanges(withBuilder(withReact(createEditor()))),
    ),
  )

  const isPreservingFocus = useRef(false)
  useSyncDOMSelection(editor, isPreservingFocus)

  const editMode = useBuilderEditMode()

  useSyncRemoteChanges(editor, text)

  useEffect(() => {
    if (control == null) return

    const element = ReactEditor.toDOMNode(editor, editor)
    return pollBoxModel({
      element,
      onBoxModelChange: boxModel => control.changeBoxModel(boxModel),
    })
  }, [editor, control])

  const renderElement = useCallback(
    (props: RenderElementProps) => {
      return <RichTextV2Element {...props} definition={definition} plugins={plugins} />
    },
    [plugins, definition],
  )

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => {
      return <RichTextV2Leaf {...props} definition={definition} plugins={plugins} />
    },
    [plugins, definition],
  )

  const initialValue = useMemo(
    () =>
      (text && richTextV2DataToDescendents(text)) ?? definition.config.defaultValue ?? defaultText,
    [text, definition],
  )

  useEffect(() => {
    /**
     * This is required because clicking on the overlay has `relatedTarget` null just like the sidebar, but
     * - in the case of the overlay we switch to BUILD mode
     * - in the case of the sidebar we preserve the selection
     */
    if (editMode !== BuilderEditMode.CONTENT) {
      isPreservingFocus.current = false
      ReactEditor.deselect(editor)
    }
  }, [editMode])

  useEffect(() => {
    const defaultValue = definition.config.defaultValue ?? defaultText

    control?.setEditor(editor)
    control?.setDefaultValue(defaultValue)

    /**
     * When initialValue is set to the default value we need to trigger an local change so that the sidebar updates and so the data is saved
     */
    if (initialValue === defaultValue) {
      control?.onLocalUserChange()
    }
  }, [control, definition, editor])

  const handleFocus = useCallback(() => {
    isPreservingFocus.current = true
    control?.select()
  }, [control])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isHotkey('mod+shift+z', e)) return control?.redo()
      if (isHotkey('mod+z', e)) return control?.undo()
      if (isHotkey('escape')(e)) {
        isPreservingFocus.current = false
        ReactEditor.blur(editor)
        control?.switchToBuildMode()
      }

      if (editMode === BuilderEditMode.CONTENT) {
        e.stopPropagation()
      }

      plugins.forEach(plugin => plugin?.onKeyDown?.(e, editor))
    },
    [control, plugins, editor, editMode],
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (editMode === BuilderEditMode.CONTENT) {
        e.stopPropagation()
        e.preventDefault()
      }
    },
    [control, editor, editMode],
  )

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (editMode === BuilderEditMode.CONTENT) e.stopPropagation()
    },
    [editMode],
  )

  const handleBlur = useCallback((e: FocusEvent) => {
    // outside of iframe (overlay, sidebar, etc)
    if (e.relatedTarget == null) return
    // another text
    if (e.relatedTarget?.getAttribute('contenteditable') === 'true')
      isPreservingFocus.current = false
  }, [])

  return (
    <Slate editor={editor} value={initialValue}>
      <Editable
        renderLeaf={renderLeaf}
        renderElement={renderElement}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onBlur={handleBlur}
        readOnly={editMode !== BuilderEditMode.CONTENT}
        placeholder="Write some text..."
      />
    </Slate>
  )
}

export default EditableTextV2
