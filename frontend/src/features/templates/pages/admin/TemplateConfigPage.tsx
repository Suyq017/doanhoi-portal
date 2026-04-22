import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Loader, AlertCircle, Link2, ChevronDown, Unlink } from 'lucide-react';
import { FieldType, type ConfigureFieldDto } from '@/shared/types/template.types';
import { useTemplateConfigPage } from '../../hooks';
import { FullPageLoading } from '../../components/admin';
import { Toast } from '@/shared/components';
import { getAllFieldTypes, FIELD_TYPE_GROUPS } from '@/shared/constants/field-types';

const TemplateConfigPage: React.FC = () => {
  const { t } = useTranslation(['templates', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const {
    template,
    isLoading,
    state,
    statusOptions,
    setTemplateName,
    setTemplateDescription,
    setTemplateStatus,
    setStatusDropdownOpen,
    updateField,
    toggleFieldSelection,
    mergeFieldsToDate,
    performMerge,
    unmergeField,
    setShowDateMappingDialog,
    setDateMappingFields,
    handleSubmit,
    isSaving,
    isFieldMapped,
    toasts,
    hideToast,
  } = useTemplateConfigPage();

  const {
    fields,
    selectedFields,
    showDateMappingDialog,
    dateMappingFields,
    templateName,
    templateDescription,
    templateStatus,
    statusDropdownOpen,
  } = state;

  const getStatusLabel = (value: string) => {
    return statusOptions.find((opt) => opt.value === value)?.label || value;
  };

  // Early return if no ID in URL
  if (!id) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <AlertCircle className="h-5 w-5 text-red-400 inline mr-2" />
          <span className="text-red-800 dark:text-red-300">{t('templates:errors.invalidTemplateId')}</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (!template) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <AlertCircle className="h-5 w-5 text-red-400 inline mr-2" />
          <span className="text-red-800 dark:text-red-300">{t('templates:errors.templateNotFound')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/portal/admin/templates')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('templates:actions.backToList')}
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('templates:config.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('templates:config.subtitle', { name: template.name })}
              </p>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('templates:fields.status')}:
              </label>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-48 px-4 py-2 text-left border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm font-medium flex items-center justify-between"
                >
                  <span>{getStatusLabel(templateStatus)}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {statusDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setTemplateStatus(option.value as any);
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none ${templateStatus === option.value
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium'
                            : 'text-gray-900 dark:text-white'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Processing Status Alert */}
        {template.status === 'processing' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  {t('templates:messages.processingTitle')}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {t('templates:messages.processingDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inactive Status Info */}
        {template.status === 'inactive' && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-1">
                  {t('templates:messages.inactiveTitle')}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  {t('templates:messages.inactiveDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Field Type Guide */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">
            {t('templates:config.fieldTypeGuide')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(FIELD_TYPE_GROUPS).map(([key, group]) => (
              <div key={key}>
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  {t(group.labelKey)}:
                </p>
                <ul className="space-y-1.5 text-blue-700 dark:text-blue-300">
                  {group.types.map((fieldType: any) => (
                    <li key={fieldType.value} className="whitespace-pre-line">
                      <strong>{fieldType.label}:</strong> {t(fieldType.descriptionKey)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>{t('common:labels.tip')}:</strong> {t('templates:config.dateMergeTip')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info Section */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('templates:config.templateInfo')}
              </h3>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('templates:fields.name')}
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('templates:fields.description')}
                  </label>
                  <textarea
                    rows={3}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar for grouping */}
          {selectedFields.size > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {t('templates:config.fieldsSelected', { count: selectedFields.size })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={mergeFieldsToDate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    {t('templates:config.mergeToDate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      state.selectedFields.clear();
                      // Force re-render by updating state
                      toggleFieldSelection(-1); // This won't actually toggle anything, just force update
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors shadow-sm"
                  >
                    {t('common:actions.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fields Configuration Section */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('templates:config.fieldsConfig')}
              </h3>
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <FieldConfigCard
                    key={field.fieldName}
                    field={field}
                    index={index}
                    isSelected={selectedFields.has(index)}
                    isMapped={isFieldMapped(field.fieldName)}
                    onToggleSelection={() => toggleFieldSelection(index)}
                    onUpdateField={(updates) => updateField(index, updates)}
                    onUnmerge={() => unmergeField(index)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/portal/admin/templates')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors shadow-sm"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {t('templates:messages.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('templates:actions.saveConfig')}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Date Parts Mapping Dialog */}
        {showDateMappingDialog && (
          <DateMappingDialog
            fields={fields}
            selectedFields={selectedFields}
            dateMappingFields={dateMappingFields}
            onClose={() => {
              setShowDateMappingDialog(false);
              setDateMappingFields({
                dayFieldIndex: null,
                monthFieldIndex: null,
                yearFieldIndex: null,
              });
            }}
            onConfirm={() => {
              const { dayFieldIndex, monthFieldIndex, yearFieldIndex } = dateMappingFields;
              if (dayFieldIndex !== null && monthFieldIndex !== null && yearFieldIndex !== null) {
                performMerge({ dayFieldIndex, monthFieldIndex, yearFieldIndex });
              }
              setShowDateMappingDialog(false);
              setDateMappingFields({
                dayFieldIndex: null,
                monthFieldIndex: null,
                yearFieldIndex: null,
              });
            }}
            onUpdateMapping={setDateMappingFields}
            t={t}
          />
        )}
      </div>
    </div>
  );
};

// Field Config Card Component
interface FieldConfigCardProps {
  field: ConfigureFieldDto;
  index: number;
  isSelected: boolean;
  isMapped: boolean;
  onToggleSelection: () => void;
  onUpdateField: (updates: Partial<ConfigureFieldDto>) => void;
  onUnmerge: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const FieldConfigCard: React.FC<FieldConfigCardProps> = ({
  field,
  index: _index,
  isSelected,
  isMapped,
  onToggleSelection,
  onUpdateField,
  onUnmerge,
  t,
}) => {
  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg p-5 transition-colors ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700'
          : 'bg-gray-50 dark:bg-gray-900/50'
        }`}
    >
      <div className="space-y-4">
        {/* Checkbox for selection and Unmerge button */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              disabled={isMapped}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label
              className={`block text-sm font-medium ${isMapped ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
                }`}
            >
              {isMapped ? t('templates:config.alreadyMerged') : t('templates:config.selectToMerge')}
            </label>
          </div>

          {/* Unmerge button */}
          {field.fieldType === FieldType.DATE && field.datePartsMapping && (
            <button
              type="button"
              onClick={onUnmerge}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            >
              <Unlink className="h-3 w-3 mr-1.5" />
              {t('templates:config.unmerge')}
            </button>
          )}
        </div>

        {/* Field Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('templates:config.fieldName')}
          </label>
          <input
            type="text"
            value={field.fieldName}
            disabled
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-lg shadow-sm bg-gray-100 text-gray-600 sm:text-sm cursor-not-allowed"
          />

          {/* Mapping info */}
          {field.fieldType === FieldType.DATE && field.datePartsMapping && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded text-xs">
              <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">
                {t('templates:config.mapping')}:
              </p>
              <ul className="text-blue-700 dark:text-blue-400 space-y-0.5">
                <li>
                  • {t('templates:config.day')}:{' '}
                  <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
                    {field.datePartsMapping.dayField}
                  </code>
                </li>
                <li>
                  • {t('templates:config.month')}:{' '}
                  <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
                    {field.datePartsMapping.monthField}
                  </code>
                </li>
                <li>
                  • {t('templates:config.year')}:{' '}
                  <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
                    {field.datePartsMapping.yearField}
                  </code>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('templates:config.displayName')}
            </label>
            <input
              type="text"
              value={field.displayName}
              onChange={(e) => onUpdateField({ displayName: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
            />
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('templates:config.fieldType')}
            </label>
            <select
              value={field.fieldType}
              onChange={(e) => onUpdateField({ fieldType: e.target.value as FieldType })}
              disabled={field.fieldType === FieldType.DATE && !!field.datePartsMapping}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
            >
              {getAllFieldTypes().map((ft: any) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                  {ft.needsOptions ? ` (${t('templates:config.needsOptions')})` : ''}
                </option>
              ))}
            </select>
            {field.fieldType === FieldType.DATE && field.datePartsMapping && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('templates:config.cannotChangeType')}
              </p>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('templates:config.helpText')}
          </label>
          <input
            type="text"
            value={field.helpText || ''}
            onChange={(e) => onUpdateField({ helpText: e.target.value })}
            placeholder={t('templates:config.helpTextPlaceholder')}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
          />
        </div>

        {/* Required Checkbox */}
        <div className="flex items-center">
          <label className="inline-flex items-center mt-6">
            <input
              type="checkbox"
              checked={field.validationRules?.required || false}
              onChange={(e) =>
                onUpdateField({
                  validationRules: {
                    ...field.validationRules,
                    required: e.target.checked,
                  },
                })
              }
              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('templates:validation.required')}
            </span>
          </label>
        </div>

        {/* Options for radio and checkbox */}
        {(field.fieldType === 'radio' || field.fieldType === 'checkbox') && (
          <FieldOptionsEditor field={field} onUpdateField={onUpdateField} t={t} />
        )}
      </div>
    </div>
  );
};

// Field Options Editor Component
interface FieldOptionsEditorProps {
  field: ConfigureFieldDto;
  onUpdateField: (updates: Partial<ConfigureFieldDto>) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const FieldOptionsEditor: React.FC<FieldOptionsEditorProps> = ({ field, onUpdateField, t }) => {
  return (
    <div className="col-span-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('templates:config.options')}
        </label>
        <button
          type="button"
          onClick={() => {
            const newOptions = [...(field.options || []), { value: '', label: '' }];
            onUpdateField({ options: newOptions });
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          + {t('templates:config.addOption')}
        </button>
      </div>

      <div className="space-y-2">
        {(field.options || [{ value: '', label: '' }]).map((option, optIndex) => (
          <div key={optIndex} className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-8">{optIndex + 1}.</span>
            <input
              type="text"
              value={option.label}
              onChange={(e) => {
                const newOptions = [...(field.options || [])];
                const newValue = e.target.value;
                newOptions[optIndex] = { value: newValue, label: newValue };
                onUpdateField({ options: newOptions });
              }}
              placeholder={t(`templates:config.optionPlaceholder`)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
            />
            {(field.options?.length || 0) > 1 && (
              <button
                type="button"
                onClick={() => {
                  const newOptions = (field.options || []).filter((_, i) => i !== optIndex);
                  onUpdateField({ options: newOptions });
                }}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title={t('templates:config.deleteOption')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('templates:config.optionsExample')}
      </p>
    </div>
  );
};

// Date Mapping Dialog Component
interface DateMappingDialogProps {
  fields: ConfigureFieldDto[];
  selectedFields: Set<number>;
  dateMappingFields: {
    dayFieldIndex: number | null;
    monthFieldIndex: number | null;
    yearFieldIndex: number | null;
  };
  onClose: () => void;
  onConfirm: () => void;
  onUpdateMapping: (mapping: {
    dayFieldIndex: number | null;
    monthFieldIndex: number | null;
    yearFieldIndex: number | null;
  }) => void;
  t: (key: string) => string;
}

const DateMappingDialog: React.FC<DateMappingDialogProps> = ({
  fields,
  selectedFields,
  dateMappingFields,
  onClose,
  onConfirm,
  onUpdateMapping,
  t,
}) => {
  const { dayFieldIndex, monthFieldIndex, yearFieldIndex } = dateMappingFields;

  const hasValidationError =
    dayFieldIndex !== null &&
    monthFieldIndex !== null &&
    yearFieldIndex !== null &&
    (dayFieldIndex === monthFieldIndex ||
      dayFieldIndex === yearFieldIndex ||
      monthFieldIndex === yearFieldIndex);

  const isConfirmDisabled =
    dayFieldIndex === null ||
    monthFieldIndex === null ||
    yearFieldIndex === null ||
    hasValidationError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('templates:config.selectDateFields')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('templates:config.selectDateFieldsDesc')}
        </p>

        <div className="space-y-4">
          {/* Day Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('templates:config.dayField')}
            </label>
            <select
              value={dayFieldIndex ?? ''}
              onChange={(e) =>
                onUpdateMapping({
                  ...dateMappingFields,
                  dayFieldIndex: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">-- {t('templates:config.selectField')} --</option>
              {Array.from(selectedFields).map((fieldIndex) => {
                const field = fields[fieldIndex];
                return (
                  <option key={fieldIndex} value={fieldIndex}>
                    {field.fieldName} ({field.displayName || t('templates:config.noLabel')})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Month Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('templates:config.monthField')}
            </label>
            <select
              value={monthFieldIndex ?? ''}
              onChange={(e) =>
                onUpdateMapping({
                  ...dateMappingFields,
                  monthFieldIndex: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">-- {t('templates:config.selectField')} --</option>
              {Array.from(selectedFields).map((fieldIndex) => {
                const field = fields[fieldIndex];
                return (
                  <option key={fieldIndex} value={fieldIndex}>
                    {field.fieldName} ({field.displayName || t('templates:config.noLabel')})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Year Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('templates:config.yearField')}
            </label>
            <select
              value={yearFieldIndex ?? ''}
              onChange={(e) =>
                onUpdateMapping({
                  ...dateMappingFields,
                  yearFieldIndex: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">-- {t('templates:config.selectField')} --</option>
              {Array.from(selectedFields).map((fieldIndex) => {
                const field = fields[fieldIndex];
                return (
                  <option key={fieldIndex} value={fieldIndex}>
                    {field.fieldName} ({field.displayName || t('templates:config.noLabel')})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Validation Error */}
        {hasValidationError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {t('templates:config.fieldsMustBeDifferent')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common:actions.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateConfigPage;
